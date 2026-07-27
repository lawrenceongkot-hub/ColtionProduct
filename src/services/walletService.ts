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
  } catch {
    return [];
  }
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
  getBalances(userId: string): { main: number; semWallet: number; ongoing: number } {
    const wallet = getOrCreateWallet(userId);
    return {
      main: wallet.main,
      semWallet: wallet.semWallet,
      ongoing: wallet.ongoing,
    };
  },

  deposit(userId: string, amount: number): void {
    const wallets = getWallets();
    let wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
      wallet = { userId, main: 0, semWallet: 0, ongoing: 0 };
      wallets.push(wallet);
    }
    wallet.main += amount;
    saveWallets(wallets);
  },

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

  withdraw(userId: string, amount: number): boolean {
    const wallets = getWallets();
    const wallet = wallets.find(w => w.userId === userId);
    if (wallet && wallet.main >= amount) {
      wallet.main -= amount;
      saveWallets(wallets);
      return true;
    }
    return false;
  },
};