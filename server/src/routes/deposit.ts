import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const depositRouter = Router();

depositRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method, proofOfPayment } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const reference = 'DEP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const parsedAmount = parseFloat(amount);

    const deposit = await prisma.$transaction(async (tx) => {
      const d = await tx.deposit.create({
        data: {
          userId: req.user!.id,
          amount: parsedAmount,
          method: method || 'bank_transfer',
          reference,
          proofOfPayment: proofOfPayment || '',
          status: 'PENDING',
        },
      });
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'DEPOSIT',
          amount: parsedAmount,
          method: method || 'bank_transfer',
          reference,
          status: 'PENDING',
        },
      });
      return d;
    });

    res.status(201).json(deposit);
  } catch (e: any) {
    console.error('Deposit create error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to create deposit' });
  }
});

depositRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const deposits = await prisma.deposit.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deposits);
  } catch {
    res.status(500).json({ error: 'Failed to get deposits' });
  }
});