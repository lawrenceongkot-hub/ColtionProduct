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
      const w = await tx.wallet.findUnique({ where: { userId: req.user!.id } });
      if (!w || w.main < parsedAmount) throw new Error('Insufficient balance');
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
  } catch {
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