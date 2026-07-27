import type { Transaction } from '../../types';

const TX_KEY = 'coltion_transactions';
const WALLET_KEY = 'coltion_wallets';
const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const NOTIFICATIONS_KEY = 'coltion_notifications';
const ADMIN_SESSION_KEY = 'coltion_admin_session';
const USERS_KEY = 'coltion_users';
const EWALLET_KEY = 'coltion_ewallets';
const ORDERS_KEY = 'coltion_orders';

const PROCESSING_FEE_RATE = 0.02; // 2% processing fee

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

function addAuditLog(userId: string, withdrawalId: string, action: string, before: string, after: string, amount: number): void {
  const admin = getAdminInfo();
  const logs = getItems<any>(AUDIT_LOG_KEY);
  logs.unshift({
    id: generateId('aud_'), adminId: admin.id, adminName: admin.name, adminRole: admin.role,
    userId, withdrawalId, action, beforeValue: before, afterValue: after,
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

function addTransaction(userId: string, type: Transaction['type'], amount: number, method: string, reference: string, status: Transaction['status'], walletNumber?: string): void {
  const txs = getItems<Transaction>(TX_KEY);
  txs.push({
    id: generateId('txn_'), userId, type, amount, method, reference, status,
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    walletNumber,
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

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  userStatus: string;
  reference: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  processedBy: string | null;
  processedAt: string | null;
  completedBy: string | null;
  completedAtTime: string | null;
  paymentReference: string | null;
  transferReference: string | null;
  rejectionReason: string | null;
  notes: string | null;
}

export const withdrawalService = {
  getWithdrawals(): WithdrawalRecord[] {
    const txs = getItems<any>(TX_KEY);
    const users = getItems<any>(USERS_KEY);
    const ewallets = getItems<any>(EWALLET_KEY);

    return txs
      .filter((t: any) => t.type === 'withdrawal')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t: any) => {
        const user = users.find((u: any) => u.id === t.userId);
        const ewallet = ewallets.find((w: any) => w.userId === t.userId && w.provider === t.method);
        const amount = t.amount || 0;
        const fee = Math.round(amount * PROCESSING_FEE_RATE * 100) / 100;
        const netAmount = amount - fee;

        return {
          id: t.id,
          userId: t.userId,
          userFullName: user?.fullName || 'Unknown',
          userEmail: user?.email || '-',
          userPhone: user?.phone || '-',
          userStatus: user?.status || 'active',
          reference: t.reference || '-',
          amount,
          fee,
          netAmount,
          method: t.method || '-',
          accountName: t.accountName || ewallet?.accountName || user?.fullName || '-',
          accountNumber: t.walletNumber || ewallet?.walletNumber || '-',
          status: mapStatus(t.status),
          createdAt: t.createdAt,
          completedAt: t.completedAt || null,
          approvedBy: t.approvedBy || null,
          approvedAt: t.approvedAt || null,
          processedBy: t.processedBy || null,
          processedAt: t.processedAt || null,
          completedBy: t.completedBy || null,
          completedAtTime: t.completedAtTime || null,
          paymentReference: t.paymentReference || null,
          transferReference: t.transferReference || null,
          rejectionReason: t.rejectionReason || null,
          notes: t.notes || null,
        };
      });
  },

  searchWithdrawals(query: string, withdrawals: WithdrawalRecord[]): WithdrawalRecord[] {
    if (!query.trim()) return withdrawals;
    const q = query.toLowerCase();
    return withdrawals.filter(w =>
      w.reference.toLowerCase().includes(q) ||
      w.userFullName.toLowerCase().includes(q) ||
      w.userEmail.toLowerCase().includes(q) ||
      w.userPhone.includes(q) ||
      w.userId.toLowerCase().includes(q) ||
      w.method.toLowerCase().includes(q) ||
      w.accountNumber.includes(q) ||
      w.accountName.toLowerCase().includes(q) ||
      w.status.toLowerCase().includes(q) ||
      w.amount.toString().includes(q)
    );
  },

  /**
   * Validate withdrawal before approval
   */
  validateWithdrawal(withdrawalId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === withdrawalId && t.type === 'withdrawal');
    if (!tx) { errors.push('Withdrawal not found.'); return { valid: false, errors }; }

    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === tx.userId);
    if (!user) { errors.push('User not found.'); return { valid: false, errors }; }

    if (user.status === 'banned') errors.push('User account is banned.');
    if (user.status === 'suspended') errors.push('User account is suspended.');
    if (user.status !== 'active' && user.status !== 'banned' && user.status !== 'suspended') errors.push('User account is not active.');

    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === tx.userId);
    const mainBalance = wallet?.main || 0;
    if (mainBalance < tx.amount) errors.push(`Insufficient Main Wallet balance. Available: ₱${mainBalance.toLocaleString()}, Required: ₱${tx.amount.toLocaleString()}`);

    if (tx.amount < 100) errors.push(`Minimum withdrawal is ₱100.`);
    if (tx.amount > 50000) errors.push(`Maximum withdrawal is ₱50,000.`);

    // Check for pending conflicting withdrawal
    const pendingWithdrawals = txs.filter((t: any) =>
      t.userId === tx.userId && t.type === 'withdrawal' && t.status === 'pending' && t.id !== withdrawalId
    );
    if (pendingWithdrawals.length > 0) errors.push('User has other pending withdrawal requests.');

    return { valid: errors.length === 0, errors };
  },

  /**
   * Approve Withdrawal: Deduct from Main Wallet exactly once
   */
  approveWithdrawal(withdrawalId: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === withdrawalId && t.type === 'withdrawal');

    if (!tx) return { success: false, error: 'Withdrawal not found.' };
    if (tx.status !== 'pending') return { success: false, error: 'This withdrawal has already been processed.' };

    // Validate
    const validation = this.validateWithdrawal(withdrawalId);
    if (!validation.valid) return { success: false, error: validation.errors.join(' | ') };

    const userId = tx.userId;
    const amount = tx.amount;
    const before = tx.status;

    // Update withdrawal status
    tx.status = 'approved';
    tx.completedAt = new Date().toISOString();
    tx.approvedBy = getAdminInfo().name;
    tx.approvedAt = new Date().toISOString();
    saveItems(TX_KEY, txs);

    // Deduct Main Wallet (ONCE)
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (wallet) {
      const mainBefore = wallet.main;
      wallet.main -= amount;
      saveItems(WALLET_KEY, wallets);

      // Wallet Ledger
      addWalletLedger(userId, 'Main Wallet', 'Withdrawal', 'withdrawal_approval', withdrawalId, -amount, mainBefore, wallet.main);
    }

    // Transaction History
    addTransaction(userId, 'withdrawal', amount, tx.method, 'WD-' + withdrawalId.slice(-8).toUpperCase(), 'success', tx.walletNumber);

    // Audit Log
    addAuditLog(userId, withdrawalId, 'Withdrawal Approved', before, 'approved', amount);

    // Notification
    addNotification(userId, 'withdrawal_approved', `Your withdrawal request of ₱${amount.toLocaleString()} has been approved.`);

    notifyDashboard();
    return { success: true };
  },

  /**
   * Mark as Processing
   */
  processWithdrawal(withdrawalId: string, notes?: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === withdrawalId && t.type === 'withdrawal');

    if (!tx) return { success: false, error: 'Withdrawal not found.' };
    if (tx.status !== 'approved') return { success: false, error: 'Withdrawal must be approved before processing.' };

    const before = tx.status;
    tx.status = 'processing';
    tx.processedBy = getAdminInfo().name;
    tx.processedAt = new Date().toISOString();
    tx.notes = notes || tx.notes || null;
    saveItems(TX_KEY, txs);

    addAuditLog(tx.userId, withdrawalId, 'Withdrawal Processing', before, 'processing', tx.amount);
    addNotification(tx.userId, 'withdrawal_processing', `Your withdrawal of ₱${tx.amount.toLocaleString()} is being processed.`);

    notifyDashboard();
    return { success: true };
  },

  /**
   * Mark as Completed
   */
  completeWithdrawal(withdrawalId: string, paymentRef?: string, transferRef?: string, notes?: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === withdrawalId && t.type === 'withdrawal');

    if (!tx) return { success: false, error: 'Withdrawal not found.' };
    if (tx.status !== 'processing' && tx.status !== 'approved') return { success: false, error: 'Withdrawal must be at least approved before completing.' };

    const before = tx.status;
    tx.status = 'completed';
    tx.completedBy = getAdminInfo().name;
    tx.completedAtTime = new Date().toISOString();
    tx.paymentReference = paymentRef || tx.paymentReference || null;
    tx.transferReference = transferRef || tx.transferReference || null;
    tx.notes = notes || tx.notes || null;
    saveItems(TX_KEY, txs);

    addAuditLog(tx.userId, withdrawalId, 'Withdrawal Completed', before, 'completed', tx.amount);
    addNotification(tx.userId, 'withdrawal_completed', `Your withdrawal of ₱${tx.amount.toLocaleString()} has been successfully transferred.`);

    notifyDashboard();
    return { success: true };
  },

  /**
   * Reject Withdrawal: No wallet deduction, restore if needed
   */
  rejectWithdrawal(withdrawalId: string, reason?: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === withdrawalId && t.type === 'withdrawal');

    if (!tx) return { success: false, error: 'Withdrawal not found.' };
    if (tx.status !== 'pending') return { success: false, error: 'This withdrawal has already been processed.' };

    const before = tx.status;
    const userId = tx.userId;
    const amount = tx.amount;

    tx.status = 'rejected';
    tx.completedAt = new Date().toISOString();
    tx.approvedBy = getAdminInfo().name;
    tx.rejectionReason = reason || 'Rejected by administrator';
    saveItems(TX_KEY, txs);

    // No wallet deduction for rejection - balance stays untouched

    // Transaction History
    addTransaction(userId, 'withdrawal', amount, tx.method, 'WD-' + withdrawalId.slice(-8).toUpperCase(), 'failed', tx.walletNumber);

    // Audit Log
    addAuditLog(userId, withdrawalId, 'Withdrawal Rejected', before, 'rejected', amount);

    // Notification
    addNotification(userId, 'withdrawal_rejected', `Your withdrawal request of ₱${amount.toLocaleString()} has been rejected. Reason: ${reason || 'N/A'}`);

    notifyDashboard();
    return { success: true };
  },

  getWalletInfo(userId: string): { main: number; semWallet: number; ongoing: number; totalInvested: number; activeVIP: string; remainingDays: number } {
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    const orders = getItems<any>(ORDERS_KEY);
    const activeOrders = orders.filter((o: any) => o.userId === userId && o.status === 'active');
    const totalInvested = activeOrders.reduce((s: number, o: any) => s + o.buyAmount, 0);
    const highestVIP = activeOrders.sort((a: any, b: any) => b.vipLevel - a.vipLevel)[0];

    let remainingDays = 0;
    if (highestVIP) {
      const start = new Date(highestVIP.purchaseDate).getTime();
      const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
      remainingDays = Math.max(0, highestVIP.duration - elapsed);
    }

    return {
      main: wallet?.main || 0,
      semWallet: wallet?.semWallet || 0,
      ongoing: activeOrders.reduce((s: number, o: any) => s + (o.currentProfit || 0), 0),
      totalInvested,
      activeVIP: highestVIP ? `VIP ${highestVIP.vipLevel} - ${highestVIP.vipName}` : 'None',
      remainingDays,
    };
  },

  exportToCSV(withdrawals: WithdrawalRecord[]): string {
    const headers = ['Transaction ID', 'Reference', 'User ID', 'Full Name', 'Email', 'Phone', 'Method', 'Account Name', 'Account Number', 'Amount', 'Fee', 'Net Amount', 'Status', 'Requested Date', 'Approved Date', 'Completed Date', 'Approved By', 'Processed By', 'Completed By', 'Payment Ref', 'Transfer Ref', 'Rejection Reason', 'Notes'];
    const rows = withdrawals.map(w => [
      w.id, w.reference, w.userId, w.userFullName, w.userEmail, w.userPhone,
      w.method, w.accountName, w.accountNumber, w.amount, w.fee, w.netAmount,
      w.status, w.createdAt, w.approvedAt || '', w.completedAtTime || '',
      w.approvedBy || '', w.processedBy || '', w.completedBy || '',
      w.paymentReference || '', w.transferReference || '', w.rejectionReason || '', w.notes || '',
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  },
};

function mapStatus(s: string): string {
  if (s === 'pending' || s === 'Pending') return 'pending';
  if (s === 'success' || s === 'approved' || s === 'Approved') return 'approved';
  if (s === 'failed' || s === 'rejected' || s === 'Rejected') return 'rejected';
  if (s === 'cancelled' || s === 'Cancelled') return 'cancelled';
  if (s === 'processing' || s === 'Processing') return 'processing';
  if (s === 'completed' || s === 'Completed') return 'completed';
  return s || 'pending';
}