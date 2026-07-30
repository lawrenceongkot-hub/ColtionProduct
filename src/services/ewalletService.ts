import type { EWallet } from '../types';
import { apiService } from './api';

/**
 * E-Wallet service - all operations go through backend API.
 * No localStorage used.
 */

export const ewalletService = {
  async getWallets(): Promise<EWallet[]> {
    try {
      return await apiService.get<EWallet[]>('/ewallets');
    } catch {
      return [];
    }
  },

  /** Alias for getWallets - used by WithdrawScreen */
  async getAllWallets(): Promise<EWallet[]> {
    return this.getWallets();
  },

  /** Alias for addWallet - used by AddEwalletScreen and WithdrawScreen */
  async saveWallet(userId: string, provider: string, walletNumber: string, withdrawalPassword: string): Promise<EWallet | null> {
    return this.addWallet(provider, walletNumber, withdrawalPassword);
  },

  async addWallet(provider: string, walletNumber: string, withdrawalPassword: string): Promise<EWallet | null> {
    try {
      return await apiService.post<EWallet>('/ewallets', { provider, walletNumber, withdrawalPassword });
    } catch {
      return null;
    }
  },

  async deleteWallet(id: string): Promise<boolean> {
    try {
      await apiService.delete(`/ewallets/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  async verifyPassword(password: string): Promise<boolean> {
    try {
      const result = await apiService.post<{ valid: boolean }>('/ewallets/verify-password', { password });
      return result.valid;
    } catch {
      return false;
    }
  },
};