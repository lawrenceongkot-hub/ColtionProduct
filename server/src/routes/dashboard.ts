import { Router, Response } from 'express';
import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user!.id } });
    const orders = await prisma.investmentOrder.findMany({ where: { userId: req.user!.id } });
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activeOrders = orders.filter(o => o.status === 'ACTIVE');
    const totalInvested = orders.reduce((sum, o) => sum + o.buyAmount, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.currentProfit, 0);

    res.json({
      wallet: wallet || { main: 0, semWallet: 0, ongoing: 0 },
      activeOrders: activeOrders.length,
      totalInvested,
      totalProfit,
      recentTransactions: transactions,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});