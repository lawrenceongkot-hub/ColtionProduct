import { adminApi } from './adminApi';

export const userManagementService = {
  async getUsers(): Promise<any[]> {
    try {
      const data = await adminApi.getUsers();
      // ALWAYS return an array - never undefined/null/object
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      await adminApi.deleteUser(id);
      return true;
    } catch {
      return false;
    }
  },

  /** Search users by name, email, or phone */
  searchUsers(search: string, users: any[]): any[] {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return (Array.isArray(users) ? users : []).filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.displayId || '').toLowerCase().includes(q)
    );
  },

  async getAuditLog(userId: string): Promise<any[]> {
    try {
      const data = await adminApi.getAuditLog(userId);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getWalletBalances(userId: string): Promise<any> {
    try {
      return await adminApi.getWalletBalances(userId);
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  async addMainWallet(userId: string, amount: number): Promise<boolean> {
    try { await adminApi.addMainWallet(userId, amount); return true; } catch { return false; }
  },
  async deductMainWallet(userId: string, amount: number): Promise<boolean> {
    try { await adminApi.deductMainWallet(userId, amount); return true; } catch { return false; }
  },
  async addSemWallet(userId: string, amount: number): Promise<boolean> {
    try { await adminApi.addSemWallet(userId, amount); return true; } catch { return false; }
  },
  async deductSemWallet(userId: string, amount: number): Promise<boolean> {
    try { await adminApi.deductSemWallet(userId, amount); return true; } catch { return false; }
  },
  async banUser(userId: string): Promise<boolean> {
    try { await adminApi.banUser(userId); return true; } catch { return false; }
  },
  async unbanUser(userId: string): Promise<boolean> {
    try { await adminApi.unbanUser(userId); return true; } catch { return false; }
  },
  async suspendUser(userId: string): Promise<boolean> {
    try { await adminApi.suspendUser(userId); return true; } catch { return false; }
  },
  async activateUser(userId: string): Promise<boolean> {
    try { await adminApi.activateUser(userId); return true; } catch { return false; }
  },
  async forceLogout(userId: string): Promise<boolean> {
    try { await adminApi.forceLogout(userId); return true; } catch { return false; }
  },
  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try { await adminApi.changePassword(userId, newPassword); return true; } catch { return false; }
  },
  exportToCSV(users: any[]): string {
    const header = 'Name,Email,Phone,Display ID,Created';
    const rows = (Array.isArray(users) ? users : []).map(u => `${u.fullName || ''},${u.email || ''},${u.phone || ''},${u.displayId || ''},${u.createdAt || ''}`);
    return [header, ...rows].join('\n');
  },
};