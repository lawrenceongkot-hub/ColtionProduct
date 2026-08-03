import { adminApi } from './adminApi';

export interface OrderRecord {
  id: string;
  userId: string;
  vipLevel: number;
  vipName: string;
  buyAmount: number;
  duration: number;
  dailyRate: number;
  dailyProfitPerDay: number;
  totalReturn: number;
  currentProfit: number;
  completedDays: number;
  progressPercent: number;
  daysRemaining: number;
  status: string;
  purchaseDate: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  user?: { fullName?: string; email?: string };
}

export const orderManagementService = {
  async getOrders(): Promise<any[]> {
    try {
      const data = await adminApi.getOrders();
      // ALWAYS return an array - never undefined/null/object
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Search orders by user name, email, or VIP name */
  searchOrders(search: string, orders: any[]): any[] {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return (Array.isArray(orders) ? orders : []).filter(o =>
      (o.user?.fullName || '').toLowerCase().includes(q) ||
      (o.user?.email || '').toLowerCase().includes(q) ||
      (o.vipName || '').toLowerCase().includes(q) ||
      (o.id || '').toLowerCase().includes(q)
    );
  },

  async getWalletInfo(userId: string): Promise<any> {
    try {
      return await adminApi.getWalletBalances(userId);
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  async getProfitHistory(orderId: string): Promise<any[]> {
    try {
      const data = await adminApi.getTransactions();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async pauseOrder(orderId: string): Promise<boolean> {
    try { await adminApi.pauseOrder(orderId); return true; } catch { return false; }
  },
  async resumeOrder(orderId: string): Promise<boolean> {
    try { await adminApi.resumeOrder(orderId); return true; } catch { return false; }
  },
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    try { await adminApi.cancelOrder(orderId, reason); return true; } catch { return false; }
  },
  async completeOrder(orderId: string): Promise<boolean> {
    try { await adminApi.completeOrder(orderId); return true; } catch { return false; }
  },
  async manualCreditProfit(orderId: string): Promise<boolean> {
    try { await adminApi.manualCreditProfit(orderId); return true; } catch { return false; }
  },

  exportToCSV(orders: any[]): string {
    const header = 'User,Email,VIP,Amount,Status,Purchase Date';
    const rows = (Array.isArray(orders) ? orders : []).map(o => `${o.user?.fullName || ''},${o.user?.email || ''},${o.vipName || ''},${o.buyAmount || 0},${o.status || ''},${o.purchaseDate || ''}`);
    return [header, ...rows].join('\n');
  },
};