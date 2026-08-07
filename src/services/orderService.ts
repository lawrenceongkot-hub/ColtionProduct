import type { InvestmentOrder, OrderCalculated, VipPlan } from '../types';
import { apiService } from './api';

/**
 * Order service - reads from backend API.
 * All progress/remaining/current profit values come from the backend database.
 * No frontend calculations.
 */

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
        // Use backend-computed values directly - no frontend calculations
        const duration = order.duration || 0;
        const completedDays = order.completedDays || 0;
        const remainingDays = order.remainingDays ?? Math.max(0, duration - completedDays);
        const progressPercent = duration > 0 ? Math.min(100, Math.round((completedDays / duration) * 100)) : (order.status === 'COMPLETED' ? 100 : 0);
        const displayStatus: 'active' | 'completed' = order.status === 'COMPLETED' || completedDays >= duration ? 'completed' : 'active';
        const displayProfit = order.currentProfit || 0;

        return {
          ...order,
          displayProfit,
          displayCompletedDays: completedDays,
          daysRemaining: remainingDays,
          remainingDays,
          progressPercent,
          displayStatus,
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