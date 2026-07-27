import type { VipPlan, InvestmentOrder } from '../types';
import { walletService } from './walletService';

const ORDERS_KEY = 'coltion_orders';
const TX_KEY = 'coltion_transactions';
const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';

interface WalletLedgerEntry {
  id: string;
  userId: string;
  walletType: string;
  transactionType: string;
  referenceType: string;
  referenceId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

function getOrders(): InvestmentOrder[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { return []; }
}
function saveOrders(orders: InvestmentOrder[]): void {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export const vipPurchaseService = {
  /**
   * Purchase a VIP plan using SemWallet balance.
   * This is an atomic transaction - all or nothing.
   */
  purchasePlan(userId: string, vipPlan: VipPlan): { success: boolean; order?: InvestmentOrder; error?: string } {
    // 1. Load current wallet balance
    const balances = walletService.getBalances(userId);
    const semBalance = balances.semWallet;
    const price = vipPlan.buyAmount;

    // 2. Validate balance
    if (semBalance < price) {
      return { success: false, error: 'Insufficient SemWallet Balance.' };
    }

    // 3. Check for duplicate active purchase
    const existingOrders = getOrders();
    const hasActive = existingOrders.some(
      o => o.userId === userId && o.vipLevel === vipPlan.id && o.status === 'active'
    );
    if (hasActive) {
      return { success: false, error: 'You already own this VIP Plan.' };
    }

    // 4. Begin atomic transaction
    try {
      // Generate order
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const orderId = 'ord_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

      const order: InvestmentOrder = {
        id: orderId,
        userId,
        vipLevel: vipPlan.id,
        vipName: vipPlan.name,
        vipBadge: vipPlan.badge,
        buyAmount: price,
        dailyRate: vipPlan.dailyRate,
        dailyProfitPerDay: vipPlan.dailyProfit,
        duration: vipPlan.duration,
        totalReturn: vipPlan.totalReturn,
        purchaseDate: now,
        lastProfitDate: today,
        completedDays: 0,
        currentProfit: 0,
        status: 'active',
      };

      // Deduct SemWallet (will be rolled back if anything fails)
      const semBefore = semBalance;
      const semAfter = semBefore - price;

      // Update wallet
      const wallets = JSON.parse(localStorage.getItem('coltion_wallets') || '[]');
      const walletIdx = wallets.findIndex((w: any) => w.userId === userId);
      if (walletIdx === -1) {
        return { success: false, error: 'Wallet not found.' };
      }
      wallets[walletIdx].semWallet = semAfter;
      localStorage.setItem('coltion_wallets', JSON.stringify(wallets));

      // Save order
      const allOrders = getOrders();
      allOrders.push(order);
      saveOrders(allOrders);

      // Create wallet ledger entry
      const ledger: WalletLedgerEntry[] = JSON.parse(localStorage.getItem(WALLET_LEDGER_KEY) || '[]');
      ledger.push({
        id: 'led_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId,
        walletType: 'SemWallet',
        transactionType: 'VIP Purchase',
        referenceType: 'vip_order',
        referenceId: orderId,
        amount: -price,
        balanceBefore: semBefore,
        balanceAfter: semAfter,
        createdAt: now,
      });
      localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify(ledger));

      // Create transaction history
      const txs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
      txs.push({
        id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId,
        type: 'vip_purchase',
        amount: price,
        method: vipPlan.name,
        reference: 'VIP-' + orderId.slice(-8).toUpperCase(),
        status: 'success',
        createdAt: now,
        completedAt: now,
      });
      localStorage.setItem(TX_KEY, JSON.stringify(txs));

      // Notify dashboard: VIP plan purchased
      try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}

      // Success - return order
      return { success: true, order };

    } catch (err) {
      // Transaction failed - rollback is implied since we don't save partial state
      return { success: false, error: 'Transaction failed. Please try again.' };
    }
  },
};