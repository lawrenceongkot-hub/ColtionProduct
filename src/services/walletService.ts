import { apiService } from './api';

export const walletService = {
  async getBalances() {
    const wallet = await apiService.get<any>('/wallet');
    return { main: wallet.main, semWallet: wallet.semWallet, ongoing: wallet.ongoing };
  },

  async deposit(amount: number) {
    return apiService.post('/deposits', { amount, method: 'Manual' });
  },

  async withdraw(amount: number, method: string, walletNumber: string) {
    return apiService.post('/withdrawals', { amount, method, walletNumber });
  },

  // Legacy localStorage fallback for components not yet migrated
  depositLocal(_userId: string, _amount: number): void {},
  withdrawLocal(_userId: string, _amount: number): boolean { return false; },
  depositSemWalletLocal(_userId: string, _amount: number): void {},
};