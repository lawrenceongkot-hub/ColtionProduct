import prisma from './db';

// ============================================================
// DAILY PROFIT SCHEDULER
// Processes ALL ACTIVE investment orders automatically.
// Every ACTIVE order earns daily profit ONCE per calendar day:
//  - Creates ONE DAILY_PROFIT transaction per day
//  - Credits Ongoing Wallet ONLY (never Main Wallet)
//  - Updates Investment Progress (completedDays, remainingDays)
//  - Updates Current Accumulated Profit
//  - Updates lastProfitDate
// Prevents duplicate/skipped days using lastProfitDate.
//
// BUSINESS RULE: Daily profit is generated at 12:00 AM platform time.
// An order is eligible for a daily profit when the current calendar day
// is different from the last processed calendar day (lastProfitDate).
// This means an order purchased on Day X receives its first profit
// at the next 12:00 AM processing cycle (Day X+1).
// ============================================================

// Helper: Get the calendar day key (YYYY-MM-DD) for a date
function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function processDailyProfits(): Promise<void> {
  try {
    const now = new Date();
    const todayKey = getDayKey(now);

    // Fetch ALL ACTIVE orders across ALL users (exclude demo users)
    const activeOrders = await prisma.investmentOrder.findMany({
      where: { status: 'ACTIVE', user: { isDemo: false } },
      include: { user: true },
    });

    for (const order of activeOrders) {
      // Determine the last processed day
      // If lastProfitDate is null, the order has never received profit.
      // The first profit is due on the first calendar day AFTER purchaseDate.
      const lastProcessedDate = order.lastProfitDate || order.purchaseDate;
      const lastProcessedDayKey = getDayKey(lastProcessedDate);
      const purchaseDayKey = getDayKey(order.purchaseDate);

      // Check if the order is eligible for a new daily profit:
      // 1. The current calendar day is different from the last processed day
      // 2. The order still has remaining days
      // 3. The order hasn't completed its duration
      const isNewDay = todayKey !== lastProcessedDayKey;
      const hasRemainingDays = order.completedDays < order.duration;

      if (isNewDay && hasRemainingDays) {
        // Process exactly ONE day of profit per calendar day
        const profitAmount = order.dailyProfitPerDay;
        const newCompletedDays = order.completedDays + 1;
        const newRemainingDays = Math.max(0, order.duration - newCompletedDays);
        const newCurrentProfit = order.currentProfit + profitAmount;

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
              lastProfitDate: now,
            },
          });

          // 3. Create ONE DAILY_PROFIT transaction for this day
          await tx.transaction.create({
            data: {
              userId: order.userId,
              type: 'DAILY_PROFIT',
              amount: profitAmount,
              method: 'system',
              reference: 'PROFIT-' + order.id.slice(-8) + '-' + todayKey.replace(/-/g, ''),
              status: 'SUCCESS',
            },
          });
        });

        // Check if investment is now complete
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