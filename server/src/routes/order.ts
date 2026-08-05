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
    // Lazy daily-profit processing: for every ACTIVE order, credit daily profit to Ongoing wallet
    await prisma.$transaction(async (tx) => {
      const activeOrders = await tx.investmentOrder.findMany({ where: { userId: req.user!.id, status: 'ACTIVE' } });
      const now = new Date();
      for (const order of activeOrders) {
        const start = order.lastProfitDate || order.purchaseDate;
        const daysElapsed = Math.floor((now.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
        if (daysElapsed > 0) {
          const profitDays = Math.min(daysElapsed, order.duration - order.completedDays);
          if (profitDays > 0) {
            const profitAmount = profitDays * order.dailyProfitPerDay;
            const newCompletedDays = order.completedDays + profitDays;
            await tx.wallet.update({ where: { userId: req.user!.id }, data: { ongoing: { increment: profitAmount } } });
            await tx.investmentOrder.update({ where: { id: order.id }, data: { completedDays: newCompletedDays, currentProfit: order.currentProfit + profitAmount, lastProfitDate: now } });
            await tx.transaction.create({ data: { userId: req.user!.id, type: 'DAILY_PROFIT', amount: profitAmount, method: 'system', reference: 'PROFIT-' + order.id.slice(-8) + '-' + Date.now(), status: 'SUCCESS' } });
          }
        }
        // If duration reached, transfer principal + accumulated profit to MainWallet, mark COMPLETED
        if (order.completedDays + Math.max(daysElapsed, 0) >= order.duration || order.duration === 0) {
          const totalReturn = order.totalReturn || (order.buyAmount + order.currentProfit + Math.max(daysElapsed, 0) * order.dailyProfitPerDay);
          await tx.wallet.update({ where: { userId: req.user!.id }, data: { main: { increment: totalReturn }, ongoing: { decrement: Math.min(order.currentProfit + order.buyAmount, totalReturn) } } });
          await tx.investmentOrder.update({ where: { id: order.id }, data: { status: 'COMPLETED', completedDays: order.duration, currentProfit: totalReturn - order.buyAmount, lastProfitDate: now } });
          await tx.transaction.create({ data: { userId: req.user!.id, type: 'VIP_MATURITY_TRANSFER', amount: totalReturn, method: 'system', reference: 'MATURE-' + order.id.slice(-8) + '-' + Date.now(), status: 'SUCCESS', completedAt: now } });
        }
      }
    });

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