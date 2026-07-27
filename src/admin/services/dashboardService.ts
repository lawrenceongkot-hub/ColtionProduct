import type { Transaction, InvestmentOrder, User, VerificationRequest } from '../../types';
import { verificationService } from '../../services/verificationService';

const USERS_KEY = 'coltion_users';
const TX_KEY = 'coltion_transactions';
const ORDERS_KEY = 'coltion_orders';
const VERIFICATION_KEY = 'coltion_verifications';
const WALLET_KEY = 'coltion_wallets';
const SESSION_KEY = 'coltion_session';
const EVENTS_KEY = 'coltion_events';
const ACTIVE_SESSIONS_KEY = 'coltion_active_sessions';

export const DASHBOARD_UPDATE_EVENT = 'dashboard:update';

function getItems<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

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

export function triggerDashboardUpdate(): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify({ timestamp: Date.now(), id: Math.random().toString(36).substr(2) }));
}

// Track login/logout for real online user count
export const sessionTracker = {
  recordLogin(userId: string): void {
    const sessions = getItems<{ userId: string; loggedInAt: number }>(ACTIVE_SESSIONS_KEY);
    if (!sessions.find(s => s.userId === userId)) {
      sessions.push({ userId, loggedInAt: Date.now() });
      localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
      triggerDashboardUpdate();
    }
  },
  recordLogout(userId: string): void {
    const sessions = getItems<{ userId: string; loggedInAt: number }>(ACTIVE_SESSIONS_KEY);
    const filtered = sessions.filter(s => s.userId !== userId);
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(filtered));
    triggerDashboardUpdate();
  },
  getOnlineCount(): number {
    const sessions = getItems<{ userId: string; loggedInAt: number }>(ACTIVE_SESSIONS_KEY);
    const cutoff = Date.now() - 15 * 60 * 1000;
    return sessions.filter(s => s.loggedInAt > cutoff).length;
  },
  clear(): void {
    localStorage.removeItem(ACTIVE_SESSIONS_KEY);
  },
};

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export const dashboardService = {
  getStats(): DashboardStats {
    // DEBUG: Read raw data from the EXACT SAME storage as User Website
    const rawUsersJSON = localStorage.getItem(USERS_KEY);
    const rawWalletsJSON = localStorage.getItem(WALLET_KEY);
    const rawTxsJSON = localStorage.getItem(TX_KEY);
    const rawOrdersJSON = localStorage.getItem(ORDERS_KEY);
    const rawVerificationsJSON = localStorage.getItem(VERIFICATION_KEY);

    console.log('=== DASHBOARD DEBUG ===');
    console.log('Reading from localStorage key:', USERS_KEY);
    console.log('Raw JSON length:', rawUsersJSON?.length || 0);
    console.log('Parsed users:', rawUsersJSON ? JSON.parse(rawUsersJSON) : []);
    console.log('User count from localStorage:', rawUsersJSON ? JSON.parse(rawUsersJSON).length : 0);
    console.log('=======================');

    const users = getItems<User>(USERS_KEY);
    const txs = getItems<Transaction>(TX_KEY);
    const orders = getItems<InvestmentOrder>(ORDERS_KEY);
    const verifications = getItems<VerificationRequest>(VERIFICATION_KEY);
    const wallets = getItems<any>(WALLET_KEY);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // User stats - ALL from actual storage
    const totalUsers = users.length;
    const verifiedUsers = users.filter(u => verificationService.isVerified(u.id)).length;
    const pendingVerificationCount = verifications.filter(v => v.status === 'PENDING').length;
    const newUsersToday = users.filter(u => u.createdAt >= todayStart).length;
    const onlineUsers = sessionTracker.getOnlineCount();
    const suspendedBanned = users.filter((u: any) => u.status === 'banned' || u.status === 'suspended').length;

    // Financial stats - ALL from actual storage
    const successfulDeposits = txs.filter(t => t.type === 'deposit' && t.status === 'success');
    const successfulWithdrawals = txs.filter(t => t.type === 'withdrawal' && t.status === 'success');
    const welcomeBonuses = txs.filter(t => t.type === 'welcome_bonus' && t.status === 'success');
    const referralCommissions = txs.filter(t => t.type === 'referral_commission' && t.status === 'success');

    const totalDeposits = successfulDeposits.reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals = successfulWithdrawals.reduce((s, t) => s + t.amount, 0);
    const netRevenue = totalDeposits - totalWithdrawals;
    const totalWelcomeBonuses = welcomeBonuses.reduce((s, t) => s + t.amount, 0);
    const totalReferralCommissions = referralCommissions.reduce((s, t) => s + t.amount, 0);
    // Wallet balance from actual wallet records, not calculated
    const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + (w.main || 0), 0);

    // Investment stats - ALL from actual orders
    const activeOrders = orders.filter(o => o.status === 'active');
    const activeVIPMembers = [...new Set(activeOrders.map(o => o.userId))].length;
    const activeInvestmentOrders = activeOrders.length;
    const totalInvestedAmount = activeOrders.reduce((s, o) => s + o.buyAmount, 0);
    const dailyProfitDistributedToday = activeOrders
      .filter(o => isToday(o.lastProfitDate))
      .reduce((s, o) => s + o.dailyProfitPerDay, 0);
    const investmentsCompletingToday = orders.filter(o => {
      if (o.status !== 'active') return false;
      const start = new Date(o.purchaseDate).getTime();
      const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      return elapsed >= o.duration;
    }).length;
    const runningInvestmentPlans = activeOrders.length;

    // Pending actions from actual storage
    const pendingDeposits = txs.filter(t => t.type === 'deposit' && t.status === 'pending').length;
    const pendingWithdrawals = txs.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
    const pendingKYC = pendingVerificationCount;
    const failedTransactions = txs.filter(t => t.status === 'failed').length;
    const pendingSupportRequests = 0;

    const stats = {
      totalUsers,
      onlineUsers,
      newUsersToday,
      verifiedUsers,
      pendingVerification: pendingVerificationCount,
      suspendedBanned,
      totalDeposits,
      totalWithdrawals,
      netRevenue,
      totalWelcomeBonuses,
      totalReferralCommissions,
      totalWalletBalance,
      activeVIPMembers,
      activeInvestmentOrders,
      totalInvestedAmount,
      dailyProfitDistributedToday,
      investmentsCompletingToday,
      runningInvestmentPlans,
      pendingDeposits,
      pendingWithdrawals,
      pendingKYC,
      failedTransactions,
      pendingSupportRequests,
      lastUpdated: new Date().toISOString(),
    };

    console.log('=== DASHBOARD STATS ===');
    console.log('Total Users:', stats.totalUsers, '(from localStorage key: coltion_users)');
    console.log('Online Users:', stats.onlineUsers, '(from localStorage key: coltion_active_sessions)');
    console.log('Full stats object:', stats);
    console.log('=======================');

    return stats;
  },

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  },
};