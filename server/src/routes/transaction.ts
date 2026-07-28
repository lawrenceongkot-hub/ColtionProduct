import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const transactionRouter = Router();

transactionRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});