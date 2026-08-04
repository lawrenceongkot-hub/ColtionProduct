import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const orderRouter = Router();

orderRouter.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { vipLevel, vipName, vipBadge, buyAmount, dailyRate, dailyProfitPerDay, duration, totalReturn } = req.body;

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
    if (!wallet || wallet.semWallet < buyAmount) {
      return res.status(400).json({ error: 'Insufficient SemWallet balance' });
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.user!.id },
        data: { semWallet: { decrement: buyAmount } },
      });

      const o = await tx.investmentOrder.create({
        data: {
          userId: req.user!.id,
          vipLevel, vipName, vipBadge, buyAmount, dailyRate, dailyProfitPerDay,
          duration, totalReturn, status: 'ACTIVE',
        },
      });

      // ISSUE 4: Create VIP_PURCHASE transaction record
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'VIP_PURCHASE',
          amount: buyAmount,
          method: vipName,
          reference: 'VIP-' + o.id.slice(-8).toUpperCase(),
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      return o;
    });

    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: 'Failed to purchase VIP' });
  }
});

orderRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.investmentOrder.findMany({
      where: { userId: req.user!.id },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to get orders' });
  }
});