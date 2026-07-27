import type { InvestmentOrder, OrderCalculated, VipPlan } from '../types';
import { walletService } from './walletService';

const ORDERS_KEY = 'coltion_orders';

function getOrders(): InvestmentOrder[] {
  try {
    const data = localStorage.getItem(ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: InvestmentOrder[]): void {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function generateId(): string {
  return 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the current profit based on purchase date and today's date.
 * Profit increases ONLY at 12:00 AM each calendar day.
 * The count starts at 0 on purchase day, and increments each midnight.
 * After 30 midnights, the plan is completed and profit freezes.
 */
function calculateCurrentProfit(order: InvestmentOrder): {
  displayProfit: number;
  displayCompletedDays: number;
  daysRemaining: number;
  displayStatus: 'active' | 'completed';
  updatedOrder?: InvestmentOrder;
} {
  const today = getTodayDate();
  const purchaseDate = order.purchaseDate.split('T')[0];

  const daysSincePurchase = getDaysBetween(purchaseDate, today);
  const completedMidnights = Math.max(0, daysSincePurchase);
  const cappedCompletedDays = Math.min(completedMidnights, order.duration);
  const daysRemaining = Math.max(0, order.duration - cappedCompletedDays);
  const isCompleted = cappedCompletedDays >= order.duration;

  const calculatedProfit = cappedCompletedDays * order.dailyProfitPerDay;

  let updatedOrder: InvestmentOrder | undefined;

  if (cappedCompletedDays > order.completedDays && !isCompleted) {
    updatedOrder = {
      ...order,
      lastProfitDate: today,
      completedDays: cappedCompletedDays,
      currentProfit: calculatedProfit,
      status: 'active',
    };
  } else if (isCompleted && order.status !== 'completed') {
    // VIP just completed - mark as completed (transfer handled separately to avoid loops)
    updatedOrder = {
      ...order,
      status: 'completed',
      completedDays: order.duration,
      currentProfit: order.totalReturn,
    };
  } else if (isCompleted && order.status === 'active') {
    // Already completed based on time but status wasn't updated
    updatedOrder = {
      ...order,
      status: 'completed',
      completedDays: order.duration,
      currentProfit: order.totalReturn,
    };
  }

  return {
    displayProfit: isCompleted ? order.totalReturn : calculatedProfit,
    displayCompletedDays: isCompleted ? order.duration : cappedCompletedDays,
    daysRemaining,
    displayStatus: isCompleted ? 'completed' : 'active',
    updatedOrder,
  };
}

export const orderService = {
  /**
   * Purchase a VIP plan for a user.
   */
  purchasePlan(userId: string, vipPlan: VipPlan): InvestmentOrder {
    const orders = getOrders();
    const today = getTodayDate();

    const order: InvestmentOrder = {
      id: generateId(),
      userId,
      vipLevel: vipPlan.id,
      vipName: vipPlan.name,
      vipBadge: vipPlan.badge,
      buyAmount: vipPlan.buyAmount,
      dailyRate: vipPlan.dailyRate,
      dailyProfitPerDay: vipPlan.dailyProfit,
      duration: vipPlan.duration,
      totalReturn: vipPlan.totalReturn,
      purchaseDate: new Date().toISOString(),
      lastProfitDate: today,
      completedDays: 0,
      currentProfit: 0,
      status: 'active',
    };

    orders.push(order);
    saveOrders(orders);
    return order;
  },

  /**
   * Get all orders for a user, with calculated profit values.
   * Also handles VIP maturity transfer: when a VIP plan completes,
   * the accumulated profit is transferred from Ongoing Wallet to Main Wallet.
   */
  getUserOrders(userId: string): OrderCalculated[] {
    const orders = getOrders();
    const userOrders = orders.filter(o => o.userId === userId);
    const needsUpdate: InvestmentOrder[] = [];
    const completedOrders: InvestmentOrder[] = [];

    const calculated = userOrders.map(order => {
      const result = calculateCurrentProfit(order);
      if (result.updatedOrder) {
        needsUpdate.push(result.updatedOrder);
        // Track newly completed orders for wallet transfer
        if (result.displayStatus === 'completed' && order.status !== 'completed') {
          completedOrders.push(result.updatedOrder);
        }
      }
      return {
        ...order,
        displayProfit: result.displayProfit,
        displayCompletedDays: result.displayCompletedDays,
        daysRemaining: result.daysRemaining,
        displayStatus: result.displayStatus,
      };
    });

    // Persist any profit updates
    if (needsUpdate.length > 0) {
      const allOrders = getOrders();
      for (const updated of needsUpdate) {
        const idx = allOrders.findIndex(o => o.id === updated.id);
        if (idx !== -1) {
          allOrders[idx] = updated;
        }
      }
      saveOrders(allOrders);
      // Notify dashboard: profit distribution or order completion
      try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
    }

    // Handle VIP maturity transfer for newly completed orders
    for (const completed of completedOrders) {
      const profit = completed.totalReturn;
      // Transfer from Ongoing Wallet to Main Wallet logic
      // Since we track Ongoing Wallet separately, add profit to Main Wallet
      // and the ongoing wallet balance is the sum of active order profits
      walletService.deposit(userId, profit);

      // Record VIP maturity transfer transaction
      const TX_KEY = 'coltion_transactions';
      try {
        const txs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
        txs.push({
          id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
          userId,
          type: 'vip_maturity_transfer',
          amount: profit,
          method: completed.vipName,
          reference: 'MAT-' + completed.id.slice(-8).toUpperCase(),
          status: 'success',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
        localStorage.setItem(TX_KEY, JSON.stringify(txs));
      } catch {
        // Silently fail - transfer already completed
      }
    }

    return calculated.sort((a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  },

  /**
   * Get total active profit stored in Ongoing Wallet for a user.
   */
  getOngoingWalletBalance(userId: string): number {
    const orders = this.getUserOrders(userId);
    return orders
      .filter(o => o.displayStatus === 'active')
      .reduce((sum, o) => sum + o.displayProfit, 0);
  },

  /**
   * Get active orders count for a user.
   */
  getActiveOrderCount(userId: string): number {
    const orders = getOrders();
    return orders.filter(o => o.userId === userId && o.status === 'active').length;
  },

  /**
   * Check if a user has any orders.
   */
  hasOrders(userId: string): boolean {
    const orders = getOrders();
    return orders.some(o => o.userId === userId);
  },
};