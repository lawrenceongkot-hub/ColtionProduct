import type { InvestmentOrder, Transaction } from '../../types';

const ORDERS_KEY = 'coltion_orders';
const TX_KEY = 'coltion_transactions';
const WALLET_KEY = 'coltion_wallets';
const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const NOTIFICATIONS_KEY = 'coltion_notifications';
const ADMIN_SESSION_KEY = 'coltion_admin_session';
const USERS_KEY = 'coltion_users';
const PROFIT_HISTORY_KEY = 'coltion_profit_history';

function getItems<T>(key: string): T[] {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : []; } catch { return []; }
}
function saveItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}
function generateId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function notifyDashboard(): void {
  try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
}

function getAdminInfo(): { id: string; name: string; role: string } {
  try {
    const data = localStorage.getItem(ADMIN_SESSION_KEY);
    if (data) { const a = JSON.parse(data); return { id: a.id, name: a.name, role: a.role }; }
  } catch {}
  return { id: 'unknown', name: 'Unknown Admin', role: 'unknown' };
}

function addAuditLog(userId: string, orderId: string, action: string, before: string, after: string, amount: number): void {
  const admin = getAdminInfo();
  const logs = getItems<any>(AUDIT_LOG_KEY);
  logs.unshift({
    id: generateId('aud_'), adminId: admin.id, adminName: admin.name, adminRole: admin.role,
    userId, orderId, action, beforeValue: before, afterValue: after,
    amount, timestamp: new Date().toISOString(), ipAddress: '127.0.0.1',
  });
  if (logs.length > 1000) logs.length = 1000;
  saveItems(AUDIT_LOG_KEY, logs);
}

function addWalletLedger(userId: string, walletType: string, transactionType: string, referenceType: string, referenceId: string, amount: number, balanceBefore: number, balanceAfter: number): void {
  const ledger = getItems<any>(WALLET_LEDGER_KEY);
  ledger.push({
    id: generateId('led_'), userId, walletType, transactionType, referenceType, referenceId,
    amount, balanceBefore, balanceAfter, createdAt: new Date().toISOString(),
  });
  saveItems(WALLET_LEDGER_KEY, ledger);
}

function addTransaction(userId: string, type: Transaction['type'], amount: number, method: string, reference: string, status: Transaction['status']): void {
  const txs = getItems<Transaction>(TX_KEY);
  txs.push({
    id: generateId('txn_'), userId, type, amount, method, reference, status,
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
  });
  saveItems(TX_KEY, txs);
}

function addNotification(userId: string, type: string, message: string): void {
  const notifications = getItems<any>(NOTIFICATIONS_KEY);
  notifications.unshift({
    id: generateId('notif_'), userId, type, message, read: false, createdAt: new Date().toISOString(),
  });
  if (notifications.length > 200) notifications.length = 200;
  saveItems(NOTIFICATIONS_KEY, notifications);
  try { window.dispatchEvent(new CustomEvent('notification:new')); } catch {}
}

export interface OrderRecord {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  vipLevel: number;
  vipName: string;
  vipBadge: string;
  buyAmount: number;
  dailyRate: number;
  dailyProfitPerDay: number;
  duration: number;
  totalReturn: number;
  purchaseDate: string;
  lastProfitDate: string;
  completedDays: number;
  currentProfit: number;
  status: string;
  daysRemaining: number;
  progressPercent: number;
}

export const orderManagementService = {
  getOrders(): OrderRecord[] {
    const orders = getItems<any>(ORDERS_KEY);
    const users = getItems<any>(USERS_KEY);
    return orders.map((o: any) => {
      const user = users.find((u: any) => u.id === o.userId);
      const start = new Date(o.purchaseDate).getTime();
      const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, o.duration - Math.min(elapsed, o.duration));
      const progressPercent = Math.min(100, Math.round((Math.min(elapsed, o.duration) / o.duration) * 100));
      return {
        id: o.id,
        userId: o.userId,
        userFullName: user?.fullName || 'Unknown',
        userEmail: user?.email || '-',
        userPhone: user?.phone || '-',
        vipLevel: o.vipLevel || 0,
        vipName: o.vipName || '-',
        vipBadge: o.vipBadge || '',
        buyAmount: o.buyAmount || 0,
        dailyRate: o.dailyRate || 0,
        dailyProfitPerDay: o.dailyProfitPerDay || 0,
        duration: o.duration || 0,
        totalReturn: o.totalReturn || 0,
        purchaseDate: o.purchaseDate || '',
        lastProfitDate: o.lastProfitDate || '',
        completedDays: o.completedDays || 0,
        currentProfit: o.currentProfit || 0,
        status: o.status || 'active',
        daysRemaining,
        progressPercent,
      };
    }).sort((a: any, b: any) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  },

  searchOrders(query: string, orders: OrderRecord[]): OrderRecord[] {
    if (!query.trim()) return orders;
    const q = query.toLowerCase();
    return orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.userFullName.toLowerCase().includes(q) ||
      o.userEmail.toLowerCase().includes(q) ||
      o.userPhone.includes(q) ||
      o.userId.toLowerCase().includes(q) ||
      o.vipName.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  },

  pauseOrder(orderId: string): { success: boolean; error?: string } {
    const orders = getItems<any>(ORDERS_KEY);
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status !== 'active') return { success: false, error: 'Only active orders can be paused.' };
    const before = order.status;
    order.status = 'paused';
    saveItems(ORDERS_KEY, orders);
    addAuditLog(order.userId, orderId, 'Order Paused', before, 'paused', order.buyAmount);
    addNotification(order.userId, 'investment_paused', `Your ${order.vipName} investment has been paused.`);
    notifyDashboard();
    return { success: true };
  },

  resumeOrder(orderId: string): { success: boolean; error?: string } {
    const orders = getItems<any>(ORDERS_KEY);
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status !== 'paused') return { success: false, error: 'Only paused orders can be resumed.' };
    const before = order.status;
    order.status = 'active';
    saveItems(ORDERS_KEY, orders);
    addAuditLog(order.userId, orderId, 'Order Resumed', before, 'active', order.buyAmount);
    addNotification(order.userId, 'investment_resumed', `Your ${order.vipName} investment has been resumed.`);
    notifyDashboard();
    return { success: true };
  },

  cancelOrder(orderId: string, reason?: string): { success: boolean; error?: string } {
    const orders = getItems<any>(ORDERS_KEY);
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status === 'completed' || order.status === 'cancelled') return { success: false, error: 'Order has already ended.' };
    const before = order.status;
    order.status = 'cancelled';
    saveItems(ORDERS_KEY, orders);
    addAuditLog(order.userId, orderId, 'Order Cancelled', before, 'cancelled', order.buyAmount);
    addNotification(order.userId, 'investment_cancelled', `Your ${order.vipName} investment has been cancelled. Reason: ${reason || 'N/A'}`);
    notifyDashboard();
    return { success: true };
  },

  completeOrder(orderId: string): { success: boolean; error?: string } {
    const orders = getItems<any>(ORDERS_KEY);
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status === 'completed') return { success: false, error: 'Order is already completed.' };
    const before = order.status;
    order.status = 'completed';
    order.completedDays = order.duration;
    order.currentProfit = order.totalReturn;
    saveItems(ORDERS_KEY, orders);

    // Transfer final profit to Main Wallet
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === order.userId);
    if (wallet) {
      const mainBefore = wallet.main;
      wallet.main += order.totalReturn;
      saveItems(WALLET_KEY, wallets);
      addWalletLedger(order.userId, 'Main Wallet', 'VIP Maturity', 'order_complete', orderId, order.totalReturn, mainBefore, wallet.main);
    }
    addTransaction(order.userId, 'vip_maturity_transfer', order.totalReturn, order.vipName, 'MAT-' + orderId.slice(-8).toUpperCase(), 'success');
    addAuditLog(order.userId, orderId, 'Order Completed', before, 'completed', order.buyAmount);
    addNotification(order.userId, 'investment_completed', `Your ${order.vipName} investment has been completed! Total return: ₱${order.totalReturn.toLocaleString()}`);
    notifyDashboard();
    return { success: true };
  },

  manualCreditProfit(orderId: string): { success: boolean; error?: string } {
    const orders = getItems<any>(ORDERS_KEY);
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status !== 'active') return { success: false, error: 'Only active orders can receive profit.' };
    
    // Check if already credited today
    const today = new Date().toISOString().split('T')[0];
    if (order.lastProfitDate === today) return { success: false, error: 'Profit already credited today. Cannot credit twice for the same day.' };

    const before = order.status;
    const profitAmount = order.dailyProfitPerDay;
    order.completedDays = (order.completedDays || 0) + 1;
    order.currentProfit = (order.currentProfit || 0) + profitAmount;
    order.lastProfitDate = today;
    saveItems(ORDERS_KEY, orders);

    // Credit Ongoing Wallet
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === order.userId);
    if (wallet) {
      const ongoingBefore = wallet.ongoing || 0;
      wallet.ongoing = (wallet.ongoing || 0) + profitAmount;
      saveItems(WALLET_KEY, wallets);
      addWalletLedger(order.userId, 'Ongoing Wallet', 'Daily Profit', 'profit_credit', orderId, profitAmount, ongoingBefore, wallet.ongoing);
    }
    addTransaction(order.userId, 'daily_profit', profitAmount, order.vipName, 'PRF-' + orderId.slice(-8).toUpperCase(), 'success');

    // Profit history
    const profitHistory = getItems<any>(PROFIT_HISTORY_KEY);
    profitHistory.push({
      id: generateId('prf_'), orderId, userId: order.userId,
      amount: profitAmount, date: today, walletCredited: 'Ongoing Wallet',
      status: 'credited', createdAt: new Date().toISOString(),
    });
    saveItems(PROFIT_HISTORY_KEY, profitHistory);

    addAuditLog(order.userId, orderId, 'Manual Profit Credit', before, 'profit credited', profitAmount);
    addNotification(order.userId, 'profit_credited', `Daily profit of ₱${profitAmount.toLocaleString()} credited to your ${order.vipName} investment.`);

    notifyDashboard();
    return { success: true };
  },

  getProfitHistory(orderId: string): any[] {
    return getItems<any>(PROFIT_HISTORY_KEY).filter((p: any) => p.orderId === orderId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getWalletInfo(userId: string): { main: number; semWallet: number; ongoing: number } {
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    return { main: wallet?.main || 0, semWallet: wallet?.semWallet || 0, ongoing: wallet?.ongoing || 0 };
  },

  exportToCSV(orders: OrderRecord[]): string {
    const headers = ['Order ID', 'User ID', 'Full Name', 'Email', 'Phone', 'VIP Level', 'VIP Name', 'Amount', 'Daily Profit', 'Duration', 'Total Return', 'Days Completed', 'Days Remaining', 'Progress %', 'Status', 'Purchase Date', 'Last Profit Date'];
    const rows = orders.map(o => [o.id, o.userId, o.userFullName, o.userEmail, o.userPhone, o.vipLevel, o.vipName, o.buyAmount, o.dailyProfitPerDay, o.duration, o.totalReturn, o.completedDays, o.daysRemaining, o.progressPercent, o.status, o.purchaseDate, o.lastProfitDate].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  },
};