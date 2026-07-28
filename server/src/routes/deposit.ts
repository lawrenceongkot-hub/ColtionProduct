import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const depositRouter = Router();

depositRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { amount, method } = req.body;
    const reference = 'DEP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

    const deposit = await prisma.deposit.create({
      data: {
        userId: req.user!.id,
        amount,
        method,
        reference,
        status: 'PENDING',
      },
    });

    await prisma.transaction.create({
      data: {
        userId: req.user!.id,
        type: 'DEPOSIT',
        amount,
        method,
        reference,
        status: 'PENDING',
      },
    });

    res.status(201).json(deposit);
  } catch {
    res.status(500).json({ error: 'Failed to create deposit' });
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