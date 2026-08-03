import { adminApi } from './adminApi';

export interface DepositRecord {
  id: string;
  userId: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  bonusApplied: number;
  bonusType: string | null;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  user?: { fullName?: string; email?: string };
}

export const depositService = {
  async getDeposits(): Promise<any[]> {
    try {
      const data = await adminApi.getDeposits();
      // ALWAYS return an array - never undefined/null/object
      return Array.isArray(data) ? data : [];
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
    return (Array.isArray(deposits) ? deposits : []).filter(d =>
      (d.reference || '').toLowerCase().includes(q) ||
      (d.user?.fullName || '').toLowerCase().includes(q) ||
      (d.user?.email || '').toLowerCase().includes(q) ||
      (d.method || '').toLowerCase().includes(q)
    );
  },

  exportToCSV(deposits: any[]): string {
    const header = 'Reference,User,Email,Amount,Method,Status,Created';
    const rows = (Array.isArray(deposits) ? deposits : []).map(d => `${d.reference || ''},${d.user?.fullName || ''},${d.user?.email || ''},${d.amount || 0},${d.method || ''},${d.status || ''},${d.createdAt || ''}`);
    return [header, ...rows].join('\n');
  },
};