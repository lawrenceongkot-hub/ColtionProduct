import type { Transaction } from '../types';
import { walletService } from './walletService';

// Notify dashboard of data changes
function notifyDashboard(): void {
  try {
    window.dispatchEvent(new CustomEvent('dashboard:update'));
  } catch {}
}

const TX_KEY = 'coltion_transactions';

function getTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(TX_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTransactions(txs: Transaction[]): void {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

function generateRef(): string {
  const prefix = 'CT';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export const transactionService = {
  createDeposit(userId: string, method: string, amount: number): Transaction {
    const txs = getTransactions();
    const tx: Transaction = {
      id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      userId,
      type: 'deposit',
      amount,
      method,
      reference: generateRef(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    txs.push(tx);
    saveTransactions(txs);
    notifyDashboard();

    setTimeout(() => {
      const current = getTransactions();
      const found = current.find(t => t.id === tx.id);
      if (found && found.status === 'pending') {
        found.status = 'failed';
        found.completedAt = new Date().toISOString();
        saveTransactions(current);
      }
    }, 5 * 60 * 1000);

    return tx;
  },

  confirmDeposit(txId: string, userId: string, amount: number): void {
    const txs = getTransactions();
    const tx = txs.find(t => t.id === txId);
    if (tx && tx.status === 'pending') {
      tx.status = 'success';
      tx.completedAt = new Date().toISOString();
      saveTransactions(txs);
      walletService.depositLocal(userId, amount);
      notifyDashboard();
    }
  },

  createWithdrawal(userId: string, walletProvider: string, walletNumber: string, amount: number): Transaction {
    const txs = getTransactions();
    const tx: Transaction = {
      id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      userId,
      type: 'withdrawal',
      amount,
      method: walletProvider,
      walletNumber,
      reference: generateRef(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    txs.push(tx);
    saveTransactions(txs);
    notifyDashboard();
    return tx;
  },

  approveWithdrawal(txId: string, userId: string, amount: number): void {
    const txs = getTransactions();
    const tx = txs.find(t => t.id === txId);
    if (tx && tx.status === 'pending') {
      tx.status = 'success';
      tx.completedAt = new Date().toISOString();
      saveTransactions(txs);
      walletService.withdrawLocal(userId, amount);
      notifyDashboard();
    }
  },

  rejectWithdrawal(txId: string): void {
    const txs = getTransactions();
    const tx = txs.find(t => t.id === txId);
    if (tx && tx.status === 'pending') {
      tx.status = 'failed';
      tx.completedAt = new Date().toISOString();
      saveTransactions(txs);
      notifyDashboard();
    }
  },

  getUserTransactions(userId: string): Transaction[] {
    const txs = getTransactions();
    return txs
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};