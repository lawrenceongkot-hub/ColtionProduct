import prisma from './db';

// ============================================================
// DAILY PROFIT SCHEDULER
// Processes ALL ACTIVE investment orders automatically.
// Every ACTIVE order earns daily profit ONCE per day:
//  - Credits Ongoing Wallet
//  - Updates Investment Progress (completedDays)
//  - Updates Current Accumulated Profit
//  - Creates DAILY_PROFIT transaction (Profit History)
// Prevents duplicate/skipped days using lastProfitDate.
// ============================================================

export async function processDailyProfits(): Promise<void> {
  try {
    const now = new Date();
    // Fetch ALL ACTIVE orders across ALL users (exclude demo users)
    const activeOrders = await prisma.investmentOrder.findMany({
      where: { status: 'ACTIVE', user: { isDemo: false } },
      include: { user: true },
    });

    for (const order of activeOrders) {
      const start = order.lastProfitDate || order.purchaseDate;
      const daysElapsed = Math.floor((now.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));

      if (daysElapsed >= 1) {
        // Process ALL missed days up to remaining duration (one per day, no skip, no double)
        const profitDays = Math.min(daysElapsed, order.duration - order.completedDays);

        if (profitDays > 0) {
          const profitAmount = profitDays * order.dailyProfitPerDay;
          const newCompletedDays = order.completedDays + profitDays;

          await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
              where: { userId: order.userId },
              data: { ongoing: { increment: profitAmount } },
            });
            await tx.investmentOrder.update({
              where: { id: order.id },
              data: {
                completedDays: newCompletedDays,
                currentProfit: order.currentProfit + profitAmount,
                lastProfitDate: now,
              },
            });
            // Create ONE DAILY_PROFIT transaction per day batch (real history record)
            await tx.transaction.create({
              data: {
                userId: order.userId,
                type: 'DAILY_PROFIT',
                amount: profitAmount,
                method: 'system',
                reference: 'PROFIT-' + order.id.slice(-8) + '-' + Date.now(),
                status: 'SUCCESS',
              },
            });
          });
        }

        // Transfer to Main Wallet when duration reaches 0
        if (order.completedDays + Math.max(daysElapsed, 0) >= order.duration || order.duration === 0) {
          // Determine final order state from DB (refresh after profit update)
          const freshOrder = await prisma.investmentOrder.findUnique({ where: { id: order.id } });
          if (freshOrder) {
            const totalReturn = freshOrder.totalReturn || freshOrder.buyAmount + freshOrder.currentProfit;
            const ongoingToDeduct = Math.min(freshOrder.currentProfit + freshOrder.buyAmount, totalReturn);
            await prisma.$transaction(async (tx) => {
              await tx.wallet.update({
                where: { userId: freshOrder.userId },
                data: {
                  main: { increment: totalReturn },
                  ongoing: { decrement: ongoingToDeduct },
                },
              });
              await tx.investmentOrder.update({
                where: { id: freshOrder.id },
                data: {
                  status: 'COMPLETED',
                  completedDays: freshOrder.duration,
                  currentProfit: totalReturn - freshOrder.buyAmount,
                  lastProfitDate: now,
                },
              });
              await tx.transaction.create({
                data: {
                  userId: freshOrder.userId,
                  type: 'VIP_MATURITY_TRANSFER',
                  amount: totalReturn,
                  method: 'system',
                  reference: 'MATURE-' + freshOrder.id.slice(-8) + '-' + Date.now(),
                  status: 'SUCCESS',
                  completedAt: now,
                },
              });
            });
          }
        }
      }
    }
  } catch (e: any) {
    console.error('[Scheduler] Daily profit processing error:', e?.message || e);
  }
}

// Run immediately on start, then every 60 seconds (cheap idempotent check via lastProfitDate)
export function startDailyProfitScheduler(): void {
  processDailyProfits();
  setInterval(processDailyProfits, 60 * 1000);
  console.log('[Scheduler] Daily profit scheduler started (checks every 60s)');
}