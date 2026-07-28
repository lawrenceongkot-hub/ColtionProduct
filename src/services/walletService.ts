import { apiService } from './api';

/**
 * Wallet service - all operations go through backend API.
 * No localStorage used.
 */

export const walletService = {
  /** Get balances from backend API */
  async getBalances(): Promise<{ main: number; semWallet: number; ongoing: number }> {
    try {
      const wallet = await apiService.get<any>('/wallet');
      return { main: wallet.main, semWallet: wallet.semWallet, ongoing: wallet.ongoing };
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  async deposit(amount: number) {
    return apiService.post('/deposits', { amount, method: 'Manual' });
  },

  async withdraw(amount: number, method: string, walletNumber: string) {
    return apiService.post('/withdrawals', { amount, method, walletNumber });
  },
};