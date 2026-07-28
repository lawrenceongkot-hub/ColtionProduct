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
};