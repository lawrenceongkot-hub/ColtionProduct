import prisma from './db';

// ============================================================
// DAILY PROFIT SCHEDULER
// Processes ALL ACTIVE investment orders automatically.
// Every ACTIVE order earns daily profit ONCE per day:
//  - Creates ONE DAILY_PROFIT transaction per day
//  - Credits Ongoing Wallet ONLY (never Main Wallet)
//  - Updates Investment Progress (completedDays, remainingDays)
//  - Updates Current Accumulated Profit
//  - Updates lastProfitDate
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
        // Process ONE day at a time (no bulk catch-up, no duplicates)
        const profitDays = Math.min(daysElapsed, order.duration - order.completedDays);

        if (profitDays > 0) {
          // Process each day individually - ONE DAILY_PROFIT transaction per day
          for (let day = 0; day < profitDays; day++) {
            const profitAmount = order.dailyProfitPerDay;
            const newCompletedDays = order.completedDays + day + 1;
            const newRemainingDays = Math.max(0, order.duration - newCompletedDays);
            const newCurrentProfit = order.currentProfit + profitAmount * (day + 1);

            await prisma.$transaction(async (tx) => {
              // 1. Credit ONLY Ongoing Wallet
              await tx.wallet.update({
                where: { userId: order.userId },
                data: { ongoing: { increment: profitAmount } },
              });

              // 2. Update order progress
              await tx.investmentOrder.update({
                where: { id: order.id },
                data: {
                  completedDays: newCompletedDays,
                  remainingDays: newRemainingDays,
                  currentProfit: newCurrentProfit,
                  lastProfitDate: new Date(start.getTime() + (day + 1) * 24 * 60 * 60 * 1000),
                },
              });

              // 3. Create ONE DAILY_PROFIT transaction for this day
              await tx.transaction.create({
                data: {
                  userId: order.userId,
                  type: 'DAILY_PROFIT',
                  amount: profitAmount,
                  method: 'system',
                  reference: 'PROFIT-' + order.id.slice(-8) + '-' + Date.now() + '-' + day,
                  status: 'SUCCESS',
                },
              });
            });
          }
        }

        // Check if investment is complete (daysCompleted == duration OR remainingDays == 0)
        const freshOrder = await prisma.investmentOrder.findUnique({ where: { id: order.id } });
        if (freshOrder && freshOrder.status === 'ACTIVE' && (freshOrder.completedDays >= freshOrder.duration || freshOrder.remainingDays <= 0)) {
          // Final settlement - transfer Ongoing Wallet to Main Wallet
          const wallet = await prisma.wallet.findUnique({ where: { userId: freshOrder.userId } });
          if (wallet) {
            const ongoingBalance = wallet.ongoing;

            await prisma.$transaction(async (tx) => {
              // MainWallet += Wallet.ongoingWallet
              await tx.wallet.update({
                where: { userId: freshOrder.userId },
                data: {
                  main: { increment: ongoingBalance },
                  ongoing: 0,
                },
              });

              // Mark order COMPLETED
              await tx.investmentOrder.update({
                where: { id: freshOrder.id },
                data: {
                  status: 'COMPLETED',
                  completedDays: freshOrder.duration,
                  remainingDays: 0,
                  completedAt: now,
                  lastProfitDate: now,
                },
              });

              // Create INVESTMENT_COMPLETED transaction
              await tx.transaction.create({
                data: {
                  userId: freshOrder.userId,
                  type: 'INVESTMENT_COMPLETED',
                  amount: ongoingBalance,
                  method: 'Main Wallet',
                  reference: 'COMPLETE-' + freshOrder.id.slice(-8) + '-' + Date.now(),
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