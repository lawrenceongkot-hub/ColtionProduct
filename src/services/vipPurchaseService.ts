import type { VipPlan, InvestmentOrder } from '../types';
import { apiService } from './api';

/**
 * VIP Purchase service - all operations go through backend API.
 * No localStorage used.
 */

export const vipPurchaseService = {
  /**
   * Purchase a VIP plan using SemWallet balance via backend API.
   */
  async purchasePlan(userId: string, vipPlan: VipPlan): Promise<{ success: boolean; order?: InvestmentOrder; error?: string }> {
    try {
      const order = await apiService.post<InvestmentOrder>('/orders/purchase', {
        vipLevel: vipPlan.id,
        vipName: vipPlan.name,
        vipBadge: vipPlan.badge,
        buyAmount: vipPlan.buyAmount,
        dailyRate: vipPlan.dailyRate,
        dailyProfitPerDay: vipPlan.dailyProfit,
        duration: vipPlan.duration,
        totalReturn: vipPlan.totalReturn,
      });
      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err.message || 'Transaction failed. Please try again.' };
    }
  },
};