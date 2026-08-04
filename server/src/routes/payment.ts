import { Router, Response, Request } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const paymentRouter = Router();

// ============================================================
// SIMULATED PAYMENT GATEWAY
// This is a local test payment gateway that mimics a real
// payment provider (like Moxsys/PayMongo) so deposits can
// be tested WITHOUT requiring admin panel approval.
// ============================================================

// POST /api/payments/moxsys/checkout - Create a simulated payment session
paymentRouter.post('/moxsys/checkout', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const ref = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const parsedAmount = parseFloat(amount);

    // Create PENDING deposit + transaction (same as admin-approved flow)
    const deposit = await prisma.$transaction(async (tx) => {
      const d = await tx.deposit.create({
        data: {
          userId: req.user!.id,
          amount: parsedAmount,
          method: method || 'moxsys',
          reference: ref,
          proofOfPayment: '',
          status: 'PENDING',
        },
      });
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'DEPOSIT',
          amount: parsedAmount,
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
      checkoutUrl: `${baseUrl}/payment-gateway?ref=${ref}&amount=${parsedAmount}&method=${encodeURIComponent(method || 'moxsys')}`,
      sessionId: deposit.id,
      amount: parsedAmount,
      method: method || 'moxsys',
      status: 'PENDING',
    });
  } catch (e: any) {
    console.error('Payment checkout error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to create payment' });
  }
});

// POST /api/payments/moxsys/webhook - Simulated gateway webhook (public, no auth needed)
paymentRouter.post('/moxsys/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const status = event?.status || '';
    const externalId = event?.external_id || '';
    const paidAmount = event?.paid_amount || event?.amount || 0;

    // Only process successful payment events
    if (status === 'paid' && externalId) {
      const deposit = await prisma.deposit.findFirst({ where: { reference: externalId } });
      if (deposit && deposit.status === 'PENDING') {
        await prisma.$transaction(async (tx) => {
          await tx.deposit.update({
            where: { id: deposit.id },
            data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Moxsys (Simulated)' },
          });
          // Business rule: Deposits go to SemWallet
          await tx.wallet.update({ where: { userId: deposit.userId }, data: { semWallet: { increment: deposit.amount } } });
          await tx.transaction.updateMany({
            where: { reference: deposit.reference },
            data: { status: 'SUCCESS', completedAt: new Date() },
          });
          await tx.notification.create({
            data: { userId: deposit.userId, type: 'DEPOSIT_APPROVED', message: `Your deposit of ₱${deposit.amount.toLocaleString()} has been approved.`, read: false },
          });
        });
      }
    }
    return res.json({ status: 'received' });
  } catch (e: any) {
    console.error('Payment webhook error:', e?.message || e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/payments/simulate/pay - Simulate a successful payment (marks deposit as SUCCESS)
paymentRouter.post('/simulate/pay', async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Reference required' });

    const deposit = await prisma.deposit.findFirst({ where: { reference, userId: req.user!.id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'Deposit already processed' });

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Payment Gateway (Simulated)' },
      });
      // Business rule: Deposits go to SemWallet
      await tx.wallet.update({ where: { userId: deposit.userId }, data: { semWallet: { increment: deposit.amount } } });
      await tx.transaction.updateMany({
        where: { reference: deposit.reference },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });
      await tx.notification.create({
        data: { userId: deposit.userId, type: 'DEPOSIT_APPROVED', message: `Your deposit of ₱${deposit.amount.toLocaleString()} has been approved.`, read: false },
      });

      // Referral commission: 30% of FIRST approved deposit only (same as admin approval)
      const depositor = await tx.user.findUnique({ where: { id: deposit.userId }, select: { referrerAgentId: true, fullName: true } });
      if (depositor?.referrerAgentId) {
        const approvedDepositCount = await tx.deposit.count({ where: { userId: deposit.userId, status: 'SUCCESS' } });
        if (approvedDepositCount === 1) {
          const settings = await tx.platformSettings.findFirst();
          const rate = (settings?.referralCommissionPercent || 30) / 100;
          const agent = await tx.agentProfile.findUnique({ where: { id: depositor.referrerAgentId } });
          if (agent) {
            const existingCommission = await tx.agentCommission.findFirst({ where: { agentId: agent.id, referredUserId: deposit.userId } });
            if (!existingCommission) {
              const commission = Math.round(deposit.amount * rate * 100) / 100;
              await tx.agentCommission.create({ data: { agentId: agent.id, referredUserId: deposit.userId, referredName: depositor.fullName || 'User', depositAmount: deposit.amount, commissionRate: rate, commissionAmount: commission } });
              await tx.agentProfile.update({ where: { id: agent.id }, data: { totalCommission: { increment: commission }, qualifiedDeposits: { increment: 1 }, availableBalance: { increment: commission } } });
              await tx.agentReferral.updateMany({ where: { agentId: agent.id, userId: deposit.userId }, data: { status: 'COMMISSION_PAID', firstDeposit: deposit.amount, commission } });
              await tx.wallet.update({ where: { userId: agent.userId }, data: { main: { increment: commission } } });
              await tx.transaction.create({ data: { userId: agent.userId, type: 'REFERRAL_COMMISSION', amount: commission, method: 'system', reference: 'COMM-' + Date.now(), status: 'SUCCESS' } });
              await tx.user.update({ where: { id: agent.userId }, data: { totalReferralEarnings: { increment: commission } } });
            }
          }
        }
      }
    });

    return res.json({ success: true, reference: deposit.reference, status: 'SUCCESS' });
  } catch (e: any) {
    console.error('Simulate payment error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to simulate payment' });
  }
});

// POST /api/payments/simulate/fail - Simulate a failed payment
paymentRouter.post('/simulate/fail', async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Reference required' });

    const deposit = await prisma.deposit.findFirst({ where: { reference, userId: req.user!.id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'Deposit already processed' });

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data: { status: 'FAILED', completedAt: new Date(), approvedBy: 'Payment Gateway (Simulated)', rejectionReason: 'Payment declined by user' },
      });
      await tx.transaction.updateMany({
        where: { reference: deposit.reference },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    });

    return res.json({ success: true, reference: deposit.reference, status: 'FAILED' });
  } catch (e: any) {
    console.error('Simulate fail error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to simulate failure' });
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
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});