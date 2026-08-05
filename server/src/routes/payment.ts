import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const paymentRouter = Router();

// ============================================================
// MOXSYS PAYMENT GATEWAY
// ============================================================

// POST /api/payments/moxsys/checkout - Create a payment checkout session via real Moxsys API
paymentRouter.post('/moxsys/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const parsedAmount = Math.round(parseFloat(amount) * 100); // Moxsys uses centavos (integer)
    const moxsysApiKey = process.env.MOXSYS_API_KEY || 'Ht23THehMXQmOa9QL91mkAKhmISIaTTATlzaVK43GghH4oW8IU';
    const moxsysMode = process.env.MOXSYS_MODE || 'sandbox';

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
      metadata: { reference: ref, userId: req.user?.id },
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

    console.log('[Moxsys] Invoice created:', JSON.stringify({ id: invoiceId, url: invoiceUrl, hasQR: !!qrCode, hasDeeplink: !!deeplink }));

    // Create deposit record with Moxsys invoice reference
    const deposit = await prisma.$transaction(async (tx) => {
      const d = await tx.deposit.create({
        data: {
          userId: req.user!.id,
          amount: parseFloat(amount),
          method: method || 'moxsys',
          reference: ref,
          proofOfPayment: invoiceId || '',
          status: 'PENDING',
        },
      });
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
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
    const ref = req.params.ref as string;
    const deposit = await prisma.deposit.findFirst({ where: { reference: ref, userId: req.user!.id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    return res.json({ reference: deposit.reference, status: deposit.status, amount: deposit.amount, method: deposit.method });
  } catch {
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// POST /api/payments/moxsys/webhook - Moxsys callback for payment status updates
paymentRouter.post('/moxsys/webhook', async (req: AuthRequest, res: Response) => {
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