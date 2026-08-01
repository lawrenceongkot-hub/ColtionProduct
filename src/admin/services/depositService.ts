import { adminApi } from './adminApi';

export const depositService = {
  async getDeposits(): Promise<any[]> {
    try {
      return await adminApi.getDeposits();
    } catch {
      return [];
    }
  },

  async approveDeposit(id: string): Promise<boolean> {
    try {
      await adminApi.approveDeposit(id);
      return true;
    } catch {
      return false;
    }
  },

  async rejectDeposit(id: string, reason?: string): Promise<boolean> {
    try {
      await adminApi.rejectDeposit(id, reason);
      return true;
    } catch {
      return false;
    }
  },

  /** Search deposits by reference, user name, or email */
  searchDeposits(search: string, deposits: any[]): any[] {
    if (!search.trim()) return deposits;
    const q = search.toLowerCase();
    return deposits.filter(d =>
      (d.reference || '').toLowerCase().includes(q) ||
      (d.user?.fullName || '').toLowerCase().includes(q) ||
      (d.user?.email || '').toLowerCase().includes(q) ||
      (d.method || '').toLowerCase().includes(q)
    );
  },

  exportToCSV(deposits: any[]): string {
    const header = 'Reference,User,Email,Amount,Method,Status,Created';
    const rows = deposits.map(d => `${d.reference || ''},${d.user?.fullName || ''},${d.user?.email || ''},${d.amount || 0},${d.method || ''},${d.status || ''},${d.createdAt || ''}`);
    return [header, ...rows].join('\n');
  },
};