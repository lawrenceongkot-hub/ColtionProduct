import { Router, Response } from 'express';
import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const withdrawalRouter = Router();

withdrawalRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, walletNumber } = req.body;
    const reference = 'WTH-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
    if (!wallet || wallet.main < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: req.user!.id,
        amount,
        method,
        walletNumber,
        reference,
        status: 'PENDING',
      },
    });

    await prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: 'WITHDRAWAL',
        amount,
        method,
        walletNumber,
        reference,
        status: 'PENDING',
      },
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