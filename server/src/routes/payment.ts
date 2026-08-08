import { Router, Request, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';
import { processReferralCommission } from '../services/referralCommission';

export const paymentRouter = Router();
export const paymentWebhookRouter = Router();

// ============================================================
// MOXSYS PAYMENT GATEWAY
// ============================================================

// POST /api/payments/moxsys/checkout - Create a payment checkout session via real Moxsys API
paymentRouter.post('/moxsys/checkout', async (req: AuthRequest, res: Response) => {
  try {
    // Authentication is enforced by middleware, but double-check for safety
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userId = req.user.id;

    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const parsedAmount = Math.round(parseFloat(amount)); // Moxsys expects amount in pesos (not centavos)

    // SECURITY: Never hardcode credentials. Require production env vars.
    const moxsysApiKey = process.env.MOXSYS_API_KEY;
    const moxsysMode = process.env.MOXSYS_MODE || 'live'; // default to live (production)
    const merchantName = process.env.MOXSYS_MERCHANT_NAME || 'MPAY';

    if (!moxsysApiKey) {
      console.error('[Moxsys] Missing MOXSYS_API_KEY in server environment.');
      return res.status(500).json({ error: 'Payment gateway not configured (missing API key).' });
    }
    if (moxsysMode !== 'live') {
      console.warn(`[Moxsys] MOXSYS_MODE is "${moxsysMode}". Production expects "live".`);
    }

    // Diagnostic log: show which merchant + mode + key prefix is being used
    console.log('[Moxsys] Config:', {
      merchant: merchantName,
      mode: moxsysMode,
      apiKeyPrefix: moxsysApiKey.substring(0, 8) + '...',
      apiKeyLength: moxsysApiKey.length,
    });

    const ref = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Map platform methods to Moxsys payment_method values
    const methodMap: Record<string, string> = {
      'GCash': 'gcash',
      'Maya': 'maya',
      'QRPH': 'qrph',
      'GrabPay': 'grabpay',
      'GoTyme': 'gotyme',
      'ShopeePay': 'shopeepay',
      'UnionBank': 'unionbank',
    };
    const paymentMethod = methodMap[method] || 'checkout';

    // Moxsys requires a valid UUID v4 for the Idempotency-Key header
    const idempotencyKey = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const moxsysUrl = `https://platform.moxsys.io/api/v1/${moxsysMode}/invoices/create`;
    const moxsysPayload = {
      external_id: ref,
      amount: parsedAmount,
      payer_email: req.user?.email || '',
      description: `Wallet Deposit - ${ref}`,
      success_redirect_url: `${baseUrl}/payment-gateway?status=success&ref=${encodeURIComponent(ref)}`,
      failure_redirect_url: `${baseUrl}/payment-gateway?status=failed&ref=${encodeURIComponent(ref)}`,
      payment_method: paymentMethod,
      callback_url: `${baseUrl}/api/payments/moxsys/webhook`,
      metadata: { reference: ref, userId },
    };

    console.log('[Moxsys] POST', moxsysUrl);
    console.log('[Moxsys] Payload:', JSON.stringify(moxsysPayload));

    // Create Moxsys invoice
    const moxsysRes = await fetch(moxsysUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + moxsysApiKey,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(moxsysPayload),
    });

    const moxsysText = await moxsysRes.text();
    console.log('[Moxsys] HTTP Status:', moxsysRes.status);
    console.log('[Moxsys] Response:', moxsysText.substring(0, 2000));

    let moxsysData;
    try { moxsysData = JSON.parse(moxsysText); } catch { moxsysData = { raw: moxsysText }; }

    if (!moxsysRes.ok) {
      const errDetail = {
        httpStatus: moxsysRes.status,
        responseBody: moxsysData,
        requestUrl: moxsysUrl,
        requestPayload: moxsysPayload,
      };
      console.error('[Moxsys] REJECTED:', JSON.stringify(errDetail, null, 2));
      const providerMsg =
        moxsysData?.message ||
        moxsysData?.error ||
        moxsysData?.errors?.[0]?.message ||
        moxsysData?.detail ||
        moxsysData?.raw ||
        (typeof moxsysData === 'string' ? moxsysData : null) ||
        'Payment gateway error';
      return res.status(400).json({
        error: providerMsg,
        provider: 'Moxsys',
        providerStatus: moxsysRes.status,
        providerResponse: moxsysData,
        providerRawBody: moxsysText.substring(0, 2000),
      });
    }

    const invoice = moxsysData.data || moxsysData;
    const invoiceUrl = invoice.invoice_url || invoice.checkout_url || '';
    const invoiceId = invoice.id || '';
    const qrCode = invoice.qr_code || invoice.qrString || invoice.qr || null;
    const deeplink = invoice.deeplink || invoice.deep_link || null;

    // SANDBOX DETECTION: Block sandbox checkout URLs from reaching the user
    if (invoiceUrl && /sandbox|test|demo|simulate/i.test(invoiceUrl)) {
      console.error('[Moxsys] ⚠️  SANDBOX URL DETECTED:', invoiceUrl);
      console.error('[Moxsys] The provider returned a sandbox checkout despite live mode. Possible causes:');
      console.error('[Moxsys]   1. The API key is a sandbox/test key, not a production key');
      console.error('[Moxsys]   2. The merchant account is not activated for production');
      console.error('[Moxsys]   3. The wrong endpoint is being used');
      return res.status(500).json({
        error: 'Payment gateway returned a sandbox checkout URL. Verify that MOXSYS_API_KEY is a production key and the merchant account is activated for live mode.',
        provider: 'Moxsys',
        sandboxUrl: invoiceUrl,
        requestUrl: moxsysUrl,
        merchant: merchantName,
        mode: moxsysMode,
      });
    }

    console.log('[Moxsys] Invoice created:', JSON.stringify({ id: invoiceId, url: invoiceUrl, hasQR: !!qrCode, hasDeeplink: !!deeplink }));

    // Create deposit record with Moxsys invoice reference
    const deposit = await prisma.$transaction(async (tx) => {
      const d = await tx.deposit.create({
        data: {
          userId,
          amount: parseFloat(amount),
          method: method || 'moxsys',
          reference: ref,
          proofOfPayment: invoiceId || '',
          status: 'PENDING',
        },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount: parseFloat(amount),
          method: method || 'moxsys',
          reference: ref,
          status: 'PENDING',
        },
      });
      return d;
    });

    return res.status(201).json({
      id: deposit.id,
      reference: ref,
      checkoutUrl: invoiceUrl,
      sessionId: invoiceId,
      qrCode,
      deeplink,
      amount: parseFloat(amount),
      method: method || 'moxsys',
      status: 'PENDING',
      provider: 'Moxsys',
      providerResponse: invoice,
    });
  } catch (e: any) {
    console.error('Moxsys invoice error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Failed to create payment' });
  }
});

// GET /api/payments/moxsys/status/:ref - Check payment status
paymentRouter.get('/moxsys/status/:ref', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const ref = req.params.ref as string;
    const deposit = await prisma.deposit.findFirst({ where: { reference: ref, userId: req.user.id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    return res.json({ reference: deposit.reference, status: deposit.status, amount: deposit.amount, method: deposit.method });
  } catch {
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// POST /api/payments/moxsys/payout-webhook - Moxsys callback for payout status updates
// This is PUBLIC (no auth) because Moxsys calls this URL directly.
// Idempotency: only process if withdrawal is PENDING and has a providerReference.
paymentWebhookRouter.post('/moxsys/payout-webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const status = (event?.status || '').toLowerCase();
    const externalId = event?.external_id || event?.reference || '';
    const payoutId = event?.payout_id || event?.id || event?.data?.payout_id || event?.data?.id || '';

    console.log('[Moxsys Payout Webhook] Received:', JSON.stringify(event));

    if (!externalId) {
      return res.json({ status: 'received', error: 'Missing external_id' });
    }

    const withdrawal = await prisma.withdrawal.findFirst({ where: { reference: externalId } });
    if (!withdrawal) {
      console.warn('[Moxsys Payout Webhook] Withdrawal not found for reference:', externalId);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // Only process if still PENDING (idempotency - do not re-process completed/failed)
    if (withdrawal.status !== 'PENDING') {
      return res.json({ status: 'received', withdrawalStatus: withdrawal.status });
    }

    let mappedStatus: string | null = null;
    if (status === 'paid' || status === 'success' || status === 'completed' || status === 'sent') {
      mappedStatus = 'SUCCESS';
    } else if (status === 'failed' || status === 'cancelled' || status === 'canceled' || status === 'expired' || status === 'rejected') {
      mappedStatus = 'FAILED';
    }

    if (!mappedStatus) {
      console.log('[Moxsys Payout Webhook] Unknown status:', status, 'for', externalId);
      return res.json({ status: 'received' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: mappedStatus as any,
          completedAt: mappedStatus === 'SUCCESS' ? new Date() : withdrawal.completedAt || new Date(),
          approvedBy: mappedStatus === 'SUCCESS' ? 'Moxsys' : withdrawal.approvedBy || 'Moxsys',
          providerReference: payoutId || withdrawal.providerReference,
          providerStatus: status,
          providerMessage: event?.message || event?.reason || null,
          rejectionReason: mappedStatus === 'FAILED' ? (event?.reason || event?.message || `Payout ${status} by provider`) : withdrawal.rejectionReason,
        },
      });

      await tx.transaction.updateMany({
        where: { reference: withdrawal.reference },
        data: { status: mappedStatus as any, completedAt: new Date() },
      });

      if (mappedStatus === 'SUCCESS') {
        await tx.notification.create({
          data: { userId: withdrawal.userId, type: 'WITHDRAWAL_COMPLETED', message: `Your withdrawal of ₱${withdrawal.netAmount.toLocaleString()} has been completed.`, read: false },
        });
      } else {
        // Refund the gross amount back to the wallet on provider failure
        await tx.wallet.update({
          where: { userId: withdrawal.userId },
          data: { main: { increment: withdrawal.amount } },
        });
        await tx.notification.create({
          data: { userId: withdrawal.userId, type: 'WITHDRAWAL_FAILED', message: `Your withdrawal of ₱${withdrawal.amount.toLocaleString()} failed. Amount refunded.`, read: false },
        });
      }
    });

    return res.json({ status: 'received', withdrawalStatus: mappedStatus, reference: externalId });
  } catch (e: any) {
    console.error('Moxsys payout webhook error:', e?.message || e);
    return res.status(500).json({ error: 'Payout webhook processing failed' });
  }
});

// POST /api/payments/moxsys/webhook - Moxsys callback for payment status updates
// This is PUBLIC (no auth) because Moxsys calls this URL directly.
// Idempotency: only process if deposit.status === 'PENDING'
paymentWebhookRouter.post('/moxsys/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const status = (event?.status || '').toLowerCase();
    const externalId = event?.external_id || '';
    const paidAmount = event?.paid_amount || event?.amount || 0;

    console.log('[Moxsys Webhook] Received:', JSON.stringify(event));

    if (!externalId) {
      return res.json({ status: 'received', error: 'Missing external_id' });
    }

    const deposit = await prisma.deposit.findFirst({ where: { reference: externalId } });
    if (!deposit) {
      console.warn('[Moxsys Webhook] Deposit not found for reference:', externalId);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    let mappedStatus: string | null = null;
    if (status === 'paid' || status === 'success' || status === 'completed') {
      mappedStatus = 'SUCCESS';
    } else if (status === 'failed' || status === 'cancelled' || status === 'canceled' || status === 'expired') {
      mappedStatus = 'FAILED';
    }

    if (!mappedStatus) {
      console.log('[Moxsys Webhook] Unknown status:', status, 'for', externalId);
      return res.json({ status: 'received' });
    }

    if (deposit.status === 'PENDING') {
      await prisma.$transaction(async (tx) => {
        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: mappedStatus as any,
            completedAt: mappedStatus === 'SUCCESS' ? new Date() : deposit.completedAt || new Date(),
            approvedBy: mappedStatus === 'SUCCESS' ? 'Moxsys' : deposit.approvedBy || 'Moxsys',
            rejectionReason: mappedStatus === 'FAILED' ? (event?.reason || event?.message || `Payment ${status} by provider`) : deposit.rejectionReason,
          },
        });

        if (mappedStatus === 'SUCCESS') {
          // Business rule: Deposits go to SemWallet
          await tx.wallet.update({ where: { userId: deposit.userId }, data: { semWallet: { increment: deposit.amount } } });
          await tx.transaction.updateMany({
            where: { reference: deposit.reference },
            data: { status: 'SUCCESS', completedAt: new Date() },
          });
          await tx.notification.create({
            data: { userId: deposit.userId, type: 'DEPOSIT_APPROVED', message: `Your deposit of ₱${deposit.amount.toLocaleString()} has been approved.`, read: false },
          });

          // CRITICAL FIX: Execute referral commission (30%) for FIRST successful deposit.
          // Uses the SAME shared logic as admin approval - single source of truth.
          await processReferralCommission(tx as any, deposit.userId, deposit.amount, deposit.reference);
        } else {
          await tx.transaction.updateMany({
            where: { reference: deposit.reference },
            data: { status: 'FAILED', completedAt: new Date() },
          });
        }
      });
    }

    return res.json({ status: 'received', depositStatus: mappedStatus, reference: externalId });
  } catch (e: any) {
    console.error('Moxsys webhook error:', e?.message || e);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});