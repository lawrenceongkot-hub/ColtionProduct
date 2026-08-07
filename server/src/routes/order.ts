import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const orderRouter = Router();

orderRouter.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { vipLevel, vipName, vipBadge, buyAmount, dailyRate, dailyProfitPerDay, duration, totalReturn } = req.body;

    if (vipLevel === undefined || vipLevel === null || !buyAmount || buyAmount <= 0) {
      return res.status(400).json({ error: 'Invalid VIP data', received: { vipLevel, buyAmount, vipName, vipBadge } });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
    if (!wallet || wallet.semWallet < parseFloat(buyAmount)) {
      return res.status(400).json({ error: 'Insufficient SemWallet balance' });
    }

    const parsedAmount = parseFloat(buyAmount);

    const order = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.user!.id },
        data: { semWallet: { decrement: parsedAmount } },
      });

      const o = await tx.investmentOrder.create({
        data: {
          userId: req.user!.id,
          vipLevel: parseInt(vipLevel),
          vipName: vipName || '',
          vipBadge: vipBadge || '',
          buyAmount: parsedAmount,
          dailyRate: dailyRate || 0,
          dailyProfitPerDay: dailyProfitPerDay || 0,
          duration: duration || 30,
          totalReturn: totalReturn || 0,
          status: 'ACTIVE',
          purchaseDate: new Date(),
          completedDays: 0,
          currentProfit: 0,
        },
      });

      // Create VIP_PURCHASE transaction record
      await tx.transaction.create({
        data: {
          userId: req.user!.id,
          type: 'VIP_PURCHASE',
          amount: parsedAmount,
          method: vipName || 'VIP',
          reference: 'VIP-' + o.id.slice(-8).toUpperCase(),
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      return o;
    });

    res.status(201).json(order);
  } catch (e: any) {
    console.error('VIP purchase error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to purchase VIP' });
  }
});

orderRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Daily profit processing is handled ONLY by the scheduler (server/src/scheduler.ts).
    // This endpoint reads orders directly from the database without modifying them.
    const orders = await prisma.investmentOrder.findMany({
      where: { userId: req.user!.id },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(orders);
  } catch (e: any) {
    console.error('Get orders error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});