import { apiService } from './api';

/** LocalStorage-based wallet operations (legacy) */
const WALLET_KEY = 'coltion_wallets';

interface StoredWallet {
  userId: string;
  main: number;
  semWallet: number;
  ongoing: number;
}

function getWallets(): StoredWallet[] {
  try {
    const data = localStorage.getItem(WALLET_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveWallets(wallets: StoredWallet[]): void {
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallets));
}

function getOrCreateWallet(userId: string): StoredWallet {
  const wallets = getWallets();
  let wallet = wallets.find(w => w.userId === userId);
  if (!wallet) {
    wallet = { userId, main: 0, semWallet: 0, ongoing: 0 };
    wallets.push(wallet);
    saveWallets(wallets);
  }
  return wallet;
}

export const walletService = {
  /** Async: Get balances from backend API */
  async getBalances(): Promise<{ main: number; semWallet: number; ongoing: number }> {
    try {
      const wallet = await apiService.get<any>('/wallet');
      return { main: wallet.main, semWallet: wallet.semWallet, ongoing: wallet.ongoing };
    } catch {
      return { main: 0, semWallet: 0, ongoing: 0 };
    }
  },

  /** Sync: Get balances from localStorage (legacy) */
  getBalancesSync(userId: string): { main: number; semWallet: number; ongoing: number } {
    const wallet = getOrCreateWallet(userId);
    return { main: wallet.main, semWallet: wallet.semWallet, ongoing: wallet.ongoing };
  },

  async deposit(amount: number) {
    return apiService.post('/deposits', { amount, method: 'Manual' });
  },

  async withdraw(amount: number, method: string, walletNumber: string) {
    return apiService.post('/withdrawals', { amount, method, walletNumber });
  },

  /** Sync deposit to localStorage (legacy) */
  depositLocal(userId: string, amount: number): void {
    const wallets = getWallets();
    let wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
      wallet = { userId, main: 0, semWallet: 0, ongoing: 0 };
      wallets.push(wallet);
    }
    wallet.main += amount;
    saveWallets(wallets);
  },

  /** Sync withdraw from localStorage (legacy) */
  withdrawLocal(userId: string, amount: number): boolean {
    const wallets = getWallets();
    const wallet = wallets.find(w => w.userId === userId);
    if (wallet && wallet.main >= amount) {
      wallet.main -= amount;
      saveWallets(wallets);
      return true;
    }
    return false;
  },

  /** Sync deposit to semWallet in localStorage (legacy) */
  depositSemWallet(userId: string, amount: number): void {
    const wallets = getWallets();
    let wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
      wallet = { userId, main: 0, semWallet: 0, ongoing: 0 };
      wallets.push(wallet);
    }
    wallet.semWallet += amount;
    saveWallets(wallets);
  },
};