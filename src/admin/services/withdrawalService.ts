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
};