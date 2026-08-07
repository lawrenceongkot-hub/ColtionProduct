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

    // For WITHDRAWAL transactions, return the NET amount (after the 10% withdrawal fee)
    // so the user sees the actual amount received, not the requested gross amount.
    // The requested amount and fee remain stored on the Withdrawal record for audit.
    const withdrawalRefs = transactions
      .filter(t => t.type === 'WITHDRAWAL')
      .map(t => t.reference);

    const withdrawals = withdrawalRefs.length > 0
      ? await prisma.withdrawal.findMany({ where: { reference: { in: withdrawalRefs } } })
      : [];

    const withdrawalByRef = new Map(withdrawals.map(w => [w.reference, w]));

    const result = transactions.map(t => {
      if (t.type === 'WITHDRAWAL') {
        const wd = withdrawalByRef.get(t.reference);
        if (wd) {
          return { ...t, amount: wd.netAmount };
        }
      }
      return t;
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});
