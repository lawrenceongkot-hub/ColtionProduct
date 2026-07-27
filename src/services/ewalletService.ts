import type { EWallet } from '../types';

const EWALLET_KEY = 'coltion_ewallets';

function getWallets(): EWallet[] {
  try {
    const data = localStorage.getItem(EWALLET_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveWallets(wallets: EWallet[]): void {
  localStorage.setItem(EWALLET_KEY, JSON.stringify(wallets));
}

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export const ewalletService = {
  getAllWallets(userId: string): EWallet[] {
    const wallets = getWallets();
    return wallets.filter(w => w.userId === userId);
  },

  getWallet(userId: string): EWallet | null {
    const wallets = getWallets();
    return wallets.find(w => w.userId === userId) || null;
  },

  saveWallet(userId: string, provider: 'GCash' | 'Maya', walletNumber: string, password: string): EWallet {
    const wallets = getWallets();
    const entry: EWallet = {
      userId,
      provider,
      walletNumber,
      withdrawalPassword: simpleHash(password),
    };
    wallets.push(entry);
    saveWallets(wallets);
    return entry;
  },

  updateWalletPassword(userId: string, password: string): void {
    const wallets = getWallets();
    const hashed = simpleHash(password);
    for (const w of wallets) {
      if (w.userId === userId) {
        w.withdrawalPassword = hashed;
      }
    }
    saveWallets(wallets);
  },

  verifyPassword(userId: string, password: string): boolean {
    const wallets = getWallets();
    const userWallets = wallets.filter(w => w.userId === userId);
    if (userWallets.length === 0) return false;
    return userWallets[0].withdrawalPassword === simpleHash(password);
  },
};