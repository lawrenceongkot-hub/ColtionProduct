import { adminApi } from './adminApi';

export interface WithdrawalRecord {
  id: string;
  userId: string;
  reference: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  accountProvider: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  completedAtTime: string | null;
  approvedBy: string | null;
  processedBy: string | null;
  completedBy: string | null;
  paymentReference: string | null;
  transferReference: string | null;
  rejectionReason: string | null;
  notes: string | null;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  userStatus: string;
  user?: { fullName?: string; email?: string };
}

function normalizeStatus(status: string | undefined | null): string {
  if (!status) return '';
  return status.toLowerCase();
}

function normalizeWithdrawal(w: any): any {
  if (!w) return w;
  const user = w.user || {};
  return {
    ...w,
    status: normalizeStatus(w.status),
    // Flat fields the Admin UI reads. Backend now provides these directly,
    // but fall back to the nested user object for robustness.
    userFullName: w.userFullName || user.fullName || '',
    userEmail: w.userEmail || user.email || '',
    userPhone: w.userPhone || user.phone || '',
    userStatus: w.userStatus || user.status || '',
    userDisplayId: w.userDisplayId || user.displayId || '',
    accountName: w.accountName || user.fullName || '',
    accountNumber: w.accountNumber || w.walletNumber || '',
    accountProvider: w.accountProvider || w.method || '',
    accountId: w.accountId || '',
  };
}

export const withdrawalService = {
  async getWithdrawals(): Promise<any[]> {
    try {
      const data = await adminApi.getWithdrawals();
      // ALWAYS return an array - never undefined/null/object
      return (Array.isArray(data) ? data : []).map(normalizeWithdrawal);
    } catch {
      return [];
    }
  },

  async approveWithdrawal(id: string): Promise<boolean> {
    try {
      await adminApi.approveWithdrawal(id);
      return true;
    } catch (e: any) {
      console.error(`[Withdrawal Approve] Failed id=${id} error=${e?.message}`);
      return false;
    }
  },

  async rejectWithdrawal(id: string, reason?: string): Promise<boolean> {
    try {
      await adminApi.rejectWithdrawal(id, reason);
      return true;
    } catch {
      return false;
    }
  },

  /** Search withdrawals by reference, user name, or email */
  searchWithdrawals(search: string, withdrawals: any[]): any[] {
    if (!search.trim()) return withdrawals;
    const q = search.toLowerCase();
    return (Array.isArray(withdrawals) ? withdrawals : []).filter(w =>
      (w.reference || '').toLowerCase().includes(q) ||
      (w.user?.fullName || '').toLowerCase().includes(q) ||
      (w.user?.email || '').toLowerCase().includes(q) ||
      (w.method || '').toLowerCase().includes(q) ||
      (w.walletNumber || '').toLowerCase().includes(q)
    );
  },

  async getWalletInfo(userId: string): Promise<any> {
    try {
      return await adminApi.getWalletBalances(userId);
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  async processWithdrawal(id: string, notes?: string): Promise<boolean> {
    try { await adminApi.approveWithdrawal(id); return true; } catch { return false; }
  },

  async completeWithdrawal(id: string, paymentRef?: string, transferRef?: string, notes?: string): Promise<boolean> {
    try { await adminApi.approveWithdrawal(id); return true; } catch { return false; }
  },

  exportToCSV(withdrawals: any[]): string {
    const header = 'Reference,User,Email,Amount,Method,Wallet,Status,Created';
    const rows = (Array.isArray(withdrawals) ? withdrawals : []).map(w => `${w.reference || ''},${w.user?.fullName || ''},${w.user?.email || ''},${w.amount || 0},${w.method || ''},${w.walletNumber || ''},${w.status || ''},${w.createdAt || ''}`);
    return [header, ...rows].join('\n');
  },
};