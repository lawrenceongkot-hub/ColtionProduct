import { adminApi } from './adminApi';

export const withdrawalService = {
  async getWithdrawals(): Promise<any[]> {
    try {
      return await adminApi.getWithdrawals();
    } catch {
      return [];
    }
  },

  async approveWithdrawal(id: string): Promise<boolean> {
    try {
      await adminApi.approveWithdrawal(id);
      return true;
    } catch {
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
    return withdrawals.filter(w =>
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
    const rows = withdrawals.map(w => `${w.reference || ''},${w.user?.fullName || ''},${w.user?.email || ''},${w.amount || 0},${w.method || ''},${w.walletNumber || ''},${w.status || ''},${w.createdAt || ''}`);
    return [header, ...rows].join('\n');
  },
};