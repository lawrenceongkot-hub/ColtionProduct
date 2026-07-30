import { apiService } from './api';

/**
 * Wallet service - all operations go through backend API.
 * No localStorage used.
 */

export const walletService = {
  /** Cache for synchronous balance access */
  _cachedBalances: { main: 0, semWallet: 0, ongoing: 0 },

  /** Get balances from backend API (async) */
  async getBalances(): Promise<{ main: number; semWallet: number; ongoing: number }> {
    try {
      const wallet = await apiService.get<any>('/wallet');
      this._cachedBalances = { main: wallet.main || 0, semWallet: wallet.semWallet || 0, ongoing: wallet.ongoing || 0 };
      return this._cachedBalances;
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  /** Get balances synchronously from cache */
  getBalancesSync(): { main: number; semWallet: number; ongoing: number } {
    return this._cachedBalances;
  },

  async deposit(amount: number) {
    return apiService.post('/deposits', { amount, method: 'Manual' });
  },

  async withdraw(amount: number, method: string, walletNumber: string) {
    return apiService.post('/withdrawals', { amount, method, walletNumber });
  },
};
