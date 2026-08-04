import type { Transaction } from '../types';
import { apiService } from './api';

/**
 * Transaction service - reads from backend API.
 * No localStorage used.
 * createDeposit and confirmDeposit are placeholders that work with the backend API.
 */

export const transactionService = {
  async createDeposit(userId: string, method: string, amount: number): Promise<Transaction> {
    try {
      const deposit = await apiService.post<any>('/deposits', { amount, method });
      return {
        id: deposit.id,
        userId,
        type: 'deposit' as Transaction['type'],
        amount,
        method,
        reference: deposit.reference,
        status: 'pending' as Transaction['status'],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
    } catch (e: any) {
      console.error('createDeposit error:', e?.message || e);
      throw new Error(e?.message || 'Failed to create deposit');
    }
  },

  /** Create a Moxsys invoice (checkout session) and return the checkout URL */
  async createPayMongoCheckout(method: string, amount: number): Promise<{ checkoutUrl: string; reference: string; sessionId: string }> {
    try {
      const result = await apiService.post<any>('/payments/moxsys/checkout', { amount, method });
      return {
        checkoutUrl: result.checkoutUrl,
        reference: result.reference,
        sessionId: result.sessionId,
      };
    } catch (e: any) {
      console.error('Moxsys checkout error:', e?.message || e);
      throw new Error(e?.message || 'Failed to create payment session');
    }
  },

  /** Check the status of a Moxsys payment */
  async checkPayMongoStatus(reference: string): Promise<{ status: string; amount: number; method: string }> {
    try {
      return await apiService.get<any>(`/payments/moxsys/status/${reference}`);
    } catch {
      return { status: 'PENDING', amount: 0, method: '' };
    }
  },

  async confirmDeposit(txId: string, userId: string, amount: number): Promise<void> {
    // Deposits are confirmed by admin in the admin panel
    // This is a client-side simulation
    return;
  },

  /** Simulate a successful payment for a pending deposit (auto-approves) */
  async simulatePaymentSuccess(reference: string): Promise<{ success: boolean; status: string }> {
    try {
      return await apiService.post<any>('/payments/simulate/pay', { reference });
    } catch (e: any) {
      console.error('Simulate payment success error:', e?.message || e);
      throw new Error(e?.message || 'Failed to simulate payment');
    }
  },

  /** Simulate a failed payment for a pending deposit (marks as FAILED) */
  async simulatePaymentFailure(reference: string): Promise<{ success: boolean; status: string }> {
    try {
      return await apiService.post<any>('/payments/simulate/fail', { reference });
    } catch (e: any) {
      console.error('Simulate payment failure error:', e?.message || e);
      throw new Error(e?.message || 'Failed to simulate payment failure');
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const txs = await apiService.get<any[]>('/transactions');
      return txs.map(tx => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type?.toLowerCase() as Transaction['type'],
        amount: tx.amount,
        method: tx.method || '',
        walletNumber: tx.walletNumber,
        reference: tx.reference,
        status: tx.status?.toLowerCase() as Transaction['status'],
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      }));
    } catch {
      return [];
    }
  },
};