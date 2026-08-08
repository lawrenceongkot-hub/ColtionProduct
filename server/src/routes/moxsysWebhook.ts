import { Router, Request, Response } from 'express';
import prisma from '../db';

export const moxsysWebhookRouter = Router();

// ============================================================
// MOXSYS PAYOUT WEBHOOK
// POST /api/webhooks/moxsys/payout
// PUBLIC - Moxsys calls this directly. No auth.
// ============================================================

// Safe status transition map. Prevents invalid transitions.
// Key: current withdrawal status -> allowed incoming provider statuses
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['pending', 'processing', 'completed', 'failed', 'refunded'],
  SUCCESS: ['completed'], // completed -> completed is idempotent no-op
  FAILED: ['failed', 'refunded'], // failed -> refunded is allowed
};

function mapProviderStatus(status: string): string | null {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'PENDING';
  if (s === 'processing') return 'PENDING';
  if (s === 'completed' || s === 'paid' || s === 'success' || s === 'sent') return 'SUCCESS';
  if (s === 'failed' || s === 'cancelled' || s === 'canceled' || s === 'expired' || s === 'rejected') return 'FAILED';
  if (s === 'refunded') return 'FAILED';
  return null;
}

function isRefundStatus(status: string): boolean {
  return (status || '').toLowerCase() === 'refunded';
}

moxsysWebhookRouter.post('/payout', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const status = (event?.status || '').toLowerCase();
    const eventId = event?.id || event?.payout_id || event?.reference_id || '';
    const externalId = event?.external_id || event?.reference || '';
    const payoutId = event?.payout_id || event?.id || event?.data?.payout_id || event?.data?.id || '';

    console.log('[Moxsys Payout Webhook] Received:', JSON.stringify(event));

    // 1. Validate required fields
    if (!externalId) {
      return res.json({ status: 'received', error: 'Missing external_id' });
    }

    // 2. Find the corresponding withdrawal
    const withdrawal = await prisma.withdrawal.findFirst({ where: { reference: externalId } });
    if (!withdrawal) {
      console.warn('[Moxsys Payout Webhook] Withdrawal not found for reference:', externalId);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // 3. Verify the payout belongs to our system
    //    (withdrawal found by our own reference = belongs to us)

    // 4. Check whether this event was already processed (idempotency)
    if (eventId) {
      const existing = await prisma.payoutWebhookEvent.findUnique({ where: { eventId } });
      if (existing) {
        console.log('[Moxsys Payout Webhook] Duplicate event ignored:', eventId);
        return res.json({ status: 'received', duplicate: true });
      }
    }

    // 5. Map provider status to internal status
    const mappedStatus = mapProviderStatus(status);
    if (!mappedStatus) {
      console.log('[Moxsys Payout Webhook] Unknown status:', status, 'for', externalId);
      return res.json({ status: 'received' });
    }

    // 6. Status transition protection
    const allowed = ALLOWED_TRANSITIONS[withdrawal.status] || [];
    if (!allowed.includes(status)) {
      console.warn(`[Moxsys Payout Webhook] Invalid status transition: ${withdrawal.status} -> ${status} for ${externalId}. Ignored.`);
      return res.json({ status: 'received', ignored: 'invalid_transition' });
    }

    // 7. Process in a database transaction
    await prisma.$transaction(async (tx) => {
      // Re-check idempotency inside the transaction (race-safe)
      if (eventId) {
        const existing = await tx.payoutWebhookEvent.findUnique({ where: { eventId } });
        if (existing) {
          console.log('[Moxsys Payout Webhook] Duplicate event (tx) ignored:', eventId);
          return;
        }
      }

      // Update withdrawal status
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: mappedStatus as any,
          completedAt: mappedStatus === 'SUCCESS' ? new Date() : withdrawal.completedAt || new Date(),
          approvedBy: mappedStatus === 'SUCCESS' ? 'Moxsys' : withdrawal.approvedBy || 'Moxsys',
          providerReference: payoutId || withdrawal.providerReference,
          providerStatus: status,
          providerMessage: event?.error_message || event?.message || event?.reason || null,
          rejectionReason: mappedStatus === 'FAILED' ? (event?.error_message || event?.reason || event?.message || `Payout ${status} by provider`) : withdrawal.rejectionReason,
        },
      });

      // Update the transaction record
      await tx.transaction.updateMany({
        where: { reference: withdrawal.reference },
        data: { status: mappedStatus as any, completedAt: new Date() },
      });

      // Handle refunds (failed/refunded) - idempotent via event tracking
      if (mappedStatus === 'FAILED' && withdrawal.status !== 'FAILED') {
        // Refund the GROSS amount back to the wallet exactly once
        await tx.wallet.update({
          where: { userId: withdrawal.userId },
          data: { main: { increment: withdrawal.amount } },
        });
        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: isRefundStatus(status) ? 'WITHDRAWAL_REFUNDED' : 'WITHDRAWAL_FAILED',
            message: isRefundStatus(status)
              ? `Your withdrawal of ₱${withdrawal.amount.toLocaleString()} was refunded.`
              : `Your withdrawal of ₱${withdrawal.amount.toLocaleString()} failed. Amount refunded.`,
            read: false,
          },
        });
      } else if (mappedStatus === 'SUCCESS' && withdrawal.status !== 'SUCCESS') {
        await tx.notification.create({
          data: { userId: withdrawal.userId, type: 'WITHDRAWAL_COMPLETED', message: `Your withdrawal of ₱${withdrawal.netAmount.toLocaleString()} has been completed.`, read: false },
        });
      }

      // Record the webhook event for idempotency
      if (eventId) {
        await tx.payoutWebhookEvent.create({
          data: { eventId, withdrawalId: withdrawal.id, status },
        });
      }
    });

    return res.json({ status: 'received', withdrawalStatus: mappedStatus, reference: externalId });
  } catch (e: any) {
    console.error('Moxsys payout webhook error:', e?.message || e);
    return res.status(500).json({ error: 'Payout webhook processing failed' });
  }
});