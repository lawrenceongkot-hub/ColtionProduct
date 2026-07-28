import type { Transaction } from '../types';
import { apiService } from './api';

/**
 * Transaction service - reads from backend API.
 * No localStorage used.
 */

export const transactionService = {
  async getUserTransactions(): Promise<Transaction[]> {
    try {
      const txs = await apiService.get<any[]>('/transactions');
      return txs.map(tx => ({
        ...tx,
        status: tx.status?.toLowerCase() as Transaction['status'],
      }));
    } catch {
      return [];
    }
  },
};