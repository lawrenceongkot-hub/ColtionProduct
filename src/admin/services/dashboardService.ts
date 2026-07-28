import { adminApi } from './adminApi';

export const DASHBOARD_UPDATE_EVENT = 'dashboard:update';

export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  newUsersToday: number;
  verifiedUsers: number;
  pendingVerification: number;
  suspendedBanned: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netRevenue: number;
  totalWelcomeBonuses: number;
  totalReferralCommissions: number;
  totalWalletBalance: number;
  activeVIPMembers: number;
  activeInvestmentOrders: number;
  totalInvestedAmount: number;
  dailyProfitDistributedToday: number;
  investmentsCompletingToday: number;
  runningInvestmentPlans: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingKYC: number;
  failedTransactions: number;
  pendingSupportRequests: number;
  lastUpdated: string;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      return await adminApi.getDashboard();
    } catch {
      return {
        totalUsers: 0, onlineUsers: 0, newUsersToday: 0, verifiedUsers: 0,
        pendingVerification: 0, suspendedBanned: 0, totalDeposits: 0,
        totalWithdrawals: 0, netRevenue: 0, totalWelcomeBonuses: 0,
        totalReferralCommissions: 0, totalWalletBalance: 0, activeVIPMembers: 0,
        activeInvestmentOrders: 0, totalInvestedAmount: 0,
        dailyProfitDistributedToday: 0, investmentsCompletingToday: 0,
        runningInvestmentPlans: 0, pendingDeposits: 0, pendingWithdrawals: 0,
        pendingKYC: 0, failedTransactions: 0, pendingSupportRequests: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  },
};