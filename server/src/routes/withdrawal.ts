import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const withdrawalRouter = Router();

withdrawalRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, walletNumber } = req.body;
    const reference = 'WTH-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
    if (!wallet || wallet.main < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // ISSUE 5: Apply 10% withdrawal fee
    const parsedAmount = parseFloat(amount);
    const fee = Math.round(parsedAmount * 0.10 * 100) / 100;
    const netAmount = parsedAmount - fee;

    const withdrawal = await prisma.$transaction(async (tx) => {
      // BUG #1 FIX: Reject if user already has a PENDING withdrawal
      // Only ONE active withdrawal request may exist per user
      const existingPending = await tx.withdrawal.findFirst({
        where: { userId: req.user!.id, status: 'PENDING' },
      });
      if (existingPending) {
        throw new Error('You already have a pending withdrawal.');
      }

      const w = await tx.wallet.findUnique({ where: { userId: req.user!.id } });
      if (!w || w.main < parsedAmount) throw new Error('Insufficient balance');

      // BUG #2 FIX: Deduct Main Wallet ONCE at creation time
      // Approval will NOT deduct again
      await tx.wallet.update({ where: { userId: req.user!.id }, data: { main: { decrement: parsedAmount } } });
      const wd = await tx.withdrawal.create({
        data: {
          userId: req.user!.id,
          amount: parsedAmount,
          fee,
          netAmount,
          method,
          walletNumber,
          reference,
          status: 'PENDING',
        },
      });
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'WITHDRAWAL',
          amount: parsedAmount,
          method,
          walletNumber,
          reference,
          status: 'PENDING',
        },
      });
      return wd;
    });

    res.status(201).json(withdrawal);
  } catch (e: any) {
    // Return 409 Conflict for duplicate pending withdrawal
    if (e?.message === 'You already have a pending withdrawal.') {
      return res.status(409).json({ error: 'You already have a pending withdrawal.' });
    }
    if (e?.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    res.status(500).json({ error: 'Failed to create withdrawal' });
  }
});

withdrawalRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(withdrawals);
  } catch {
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});