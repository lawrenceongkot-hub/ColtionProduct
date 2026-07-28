import type { InvestmentOrder, OrderCalculated, VipPlan } from '../types';
import { apiService } from './api';

/**
 * Order service - reads from backend API.
 * No localStorage used.
 */

function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function calculateCurrentProfit(order: InvestmentOrder): {
  displayProfit: number;
  displayCompletedDays: number;
  daysRemaining: number;
  displayStatus: 'active' | 'completed';
} {
  const today = getTodayDate();
  const purchaseDate = order.purchaseDate.split('T')[0];

  const daysSincePurchase = getDaysBetween(purchaseDate, today);
  const completedMidnights = Math.max(0, daysSincePurchase);
  const cappedCompletedDays = Math.min(completedMidnights, order.duration);
  const daysRemaining = Math.max(0, order.duration - cappedCompletedDays);
  const isCompleted = cappedCompletedDays >= order.duration;

  return {
    displayProfit: isCompleted ? order.totalReturn : cappedCompletedDays * order.dailyProfitPerDay,
    displayCompletedDays: isCompleted ? order.duration : cappedCompletedDays,
    daysRemaining,
    displayStatus: isCompleted ? 'completed' : 'active',
  };
}

export const orderService = {
  async getOrdersFromAPI(): Promise<InvestmentOrder[]> {
    try {
      return await apiService.get<InvestmentOrder[]>('/orders');
    } catch {
      return [];
    }
  },

  async getUserOrders(userId: string): Promise<OrderCalculated[]> {
    const orders = await this.getOrdersFromAPI();
    return orders
      .filter(o => o.userId === userId)
      .map(order => {
        const result = calculateCurrentProfit(order);
        return {
          ...order,
          displayProfit: result.displayProfit,
          displayCompletedDays: result.displayCompletedDays,
          daysRemaining: result.daysRemaining,
          displayStatus: result.displayStatus,
        };
      })
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  },

  getOngoingWalletBalance(userId: string): number {
    // This is now fetched from server via /wallet endpoint
    return 0; // Use walletService.getBalances() instead
  },

  getActiveOrderCount(userId: string): number {
    // Calculated server-side
    return 0;
  },

  hasOrders(userId: string): boolean {
    return false; // Use API instead
  },
};