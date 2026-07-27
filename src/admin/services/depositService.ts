import type { Transaction } from '../../types';

const TX_KEY = 'coltion_transactions';
const WALLET_KEY = 'coltion_wallets';
const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const NOTIFICATIONS_KEY = 'coltion_notifications';
const ADMIN_SESSION_KEY = 'coltion_admin_session';
const SESSION_KEY = 'coltion_session';
const USERS_KEY = 'coltion_users';
const AGENT_REFERRALS_KEY = 'coltion_agent_referrals';
const AGENT_COMMISSIONS_KEY = 'coltion_agent_commissions';
const AGENT_KEY = 'coltion_agents';

// ==================== HELPERS ====================
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

// ==================== AUDIT LOG ====================
function addAuditLog(userId: string, depositId: string, action: string, before: string, after: string, amount: number): void {
  const admin = getAdminInfo();
  const logs = getItems<any>(AUDIT_LOG_KEY);
  logs.unshift({
    id: generateId('aud_'),
    adminId: admin.id, adminName: admin.name, adminRole: admin.role,
    userId, depositId, action, beforeValue: before, afterValue: after,
    amount, timestamp: new Date().toISOString(), ipAddress: '127.0.0.1',
  });
  if (logs.length > 1000) logs.length = 1000;
  saveItems(AUDIT_LOG_KEY, logs);
}

// ==================== WALLET LEDGER ====================
function addWalletLedger(userId: string, walletType: string, transactionType: string, referenceType: string, referenceId: string, amount: number, balanceBefore: number, balanceAfter: number): void {
  const ledger = getItems<any>(WALLET_LEDGER_KEY);
  ledger.push({
    id: generateId('led_'), userId, walletType, transactionType, referenceType, referenceId,
    amount, balanceBefore, balanceAfter, createdAt: new Date().toISOString(),
  });
  saveItems(WALLET_LEDGER_KEY, ledger);
}

// ==================== NOTIFICATIONS ====================
function addNotification(userId: string, type: string, message: string): void {
  const notifications = getItems<any>(NOTIFICATIONS_KEY);
  notifications.unshift({
    id: generateId('notif_'), userId, type, message,
    read: false, createdAt: new Date().toISOString(),
  });
  if (notifications.length > 200) notifications.length = 200;
  saveItems(NOTIFICATIONS_KEY, notifications);
  try { window.dispatchEvent(new CustomEvent('notification:new')); } catch {}
}

// ==================== DEPOSIT BONUS RULES ====================
function calculateDepositBonus(userId: string, amount: number): { bonus: number; type: string } {
  // First Deposit Bonus: 50% of deposit up to ₱500
  if (isFirstDeposit(userId)) {
    const bonus = Math.min(amount * 0.5, 500);
    return { bonus, type: 'First Deposit Bonus' };
  }
  // Reload Bonus: 10% of deposit up to ₱200
  const bonus = Math.min(amount * 0.1, 200);
  if (bonus > 0) return { bonus, type: 'Reload Bonus' };
  return { bonus: 0, type: '' };
}

function isFirstDeposit(userId: string): boolean {
  const txs = getItems<Transaction>(TX_KEY);
  return !txs.some(t => t.userId === userId && t.type === 'deposit' && t.status === 'success');
}

// ==================== DEPOSIT SERVICE ====================
export interface DepositRecord {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  reference: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  proofOfPayment: string | null;
  bonusApplied: number;
  bonusType: string;
}

export const depositService = {
  // ==================== LIST DEPOSITS ====================
  getDeposits(): DepositRecord[] {
    const txs = getItems<any>(TX_KEY);
    const users = getItems<any>('coltion_users');
    const deposits = txs
      .filter((t: any) => t.type === 'deposit')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t: any) => {
        const user = users.find((u: any) => u.id === t.userId);
        return {
          id: t.id,
          userId: t.userId,
          userFullName: user?.fullName || 'Unknown',
          userEmail: user?.email || '-',
          userPhone: user?.phone || '-',
          reference: t.reference || '-',
          amount: t.amount || 0,
          method: t.method || '-',
          status: t.status === 'pending' ? 'pending' : t.status === 'success' ? 'approved' : t.status === 'failed' ? 'rejected' : t.status || 'pending',
          createdAt: t.createdAt,
          completedAt: t.completedAt || null,
          approvedBy: t.approvedBy || null,
          rejectionReason: t.rejectionReason || null,
          proofOfPayment: t.proofOfPayment || null,
          bonusApplied: t.bonusApplied || 0,
          bonusType: t.bonusType || '',
        };
      });
    return deposits;
  },

  // ==================== SEARCH ====================
  searchDeposits(query: string, deposits: DepositRecord[]): DepositRecord[] {
    if (!query.trim()) return deposits;
    const q = query.toLowerCase();
    return deposits.filter(d =>
      d.reference.toLowerCase().includes(q) ||
      d.userFullName.toLowerCase().includes(q) ||
      d.userEmail.toLowerCase().includes(q) ||
      d.userPhone.includes(q) ||
      d.userId.toLowerCase().includes(q) ||
      d.method.toLowerCase().includes(q) ||
      d.status.toLowerCase().includes(q) ||
      d.amount.toString().includes(q)
    );
  },

  // ==================== APPROVE DEPOSIT ====================
  approveDeposit(depositId: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === depositId && t.type === 'deposit');
    
    if (!tx) return { success: false, error: 'Deposit not found.' };
    if (tx.status !== 'pending') return { success: false, error: 'Deposit has already been processed.' };

    const before = tx.status;
    const userId = tx.userId;
    const amount = tx.amount;

    // Calculate bonus
    const { bonus, type: bonusType } = calculateDepositBonus(userId, amount);

    // Update deposit
    tx.status = 'success';
    tx.completedAt = new Date().toISOString();
    tx.approvedBy = getAdminInfo().name;
    tx.bonusApplied = bonus;
    tx.bonusType = bonusType;
    saveItems(TX_KEY, txs);

    // Credit Main Wallet
    const wallets = getItems<any>(WALLET_KEY);
    let wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet) {
      wallet = { userId, main: 0, semWallet: 0, ongoing: 0 };
      wallets.push(wallet);
    }
    const mainBefore = wallet.main;
    wallet.main += amount;
    saveItems(WALLET_KEY, wallets);

    // Wallet Ledger for deposit
    addWalletLedger(userId, 'Main Wallet', 'Deposit', 'deposit_approval', depositId, amount, mainBefore, wallet.main);

    // Apply bonus to SemWallet if applicable
    if (bonus > 0) {
      const semBefore = wallet.semWallet;
      wallet.semWallet += bonus;
      saveItems(WALLET_KEY, wallets);
      addWalletLedger(userId, 'SemWallet', bonusType, 'deposit_bonus', depositId, bonus, semBefore, wallet.semWallet);

      // Bonus transaction
      const allTxs = getItems<any>(TX_KEY);
      allTxs.push({
        id: generateId('txn_'), userId, type: 'welcome_bonus',
        amount: bonus, method: bonusType,
        reference: 'BNS-' + depositId.slice(-8).toUpperCase(),
        status: 'success', createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      });
      saveItems(TX_KEY, allTxs);
    }

    // Audit Log
    addAuditLog(userId, depositId, 'Deposit Approved', before, 'success', amount);
    if (bonus > 0) {
      const logs = getItems<any>(AUDIT_LOG_KEY);
      logs.unshift({
        id: generateId('aud_'),
        adminId: getAdminInfo().id, adminName: getAdminInfo().name, adminRole: getAdminInfo().role,
        userId, depositId, action: `${bonusType} Applied`, beforeValue: '0', afterValue: bonus.toString(),
        amount: bonus, timestamp: new Date().toISOString(), ipAddress: '127.0.0.1',
      });
      if (logs.length > 1000) logs.length = 1000;
      saveItems(AUDIT_LOG_KEY, logs);
    }

    // Process referral commission for the first deposit
    try {
      const referrals = getItems<any>(AGENT_REFERRALS_KEY);
      const referral = referrals.find((r: any) => r.userId === userId);
      if (referral && referral.status !== 'commission_paid') {
        const users = getItems<any>(USERS_KEY);
        const depositor = users.find((u: any) => u.id === userId);
        if (depositor?.referrerAgentId) {
          const agents = getItems<any>(AGENT_KEY);
          const agent = agents.find((a: any) => a.id === depositor.referrerAgentId);
          if (agent) {
            // Get commission rate from Website Control or default to 30%
            let commissionRate = 0.30;
            try {
              const settings = JSON.parse(localStorage.getItem('coltion_settings') || '{}');
              if (settings.referralCommissionPercent) {
                commissionRate = settings.referralCommissionPercent / 100;
              }
            } catch {}
            
            const commissionAmount = Math.round(amount * commissionRate);

            // Update referral status
            referral.firstDeposit = amount;
            referral.commission = commissionAmount;
            referral.status = 'commission_paid';
            saveItems(AGENT_REFERRALS_KEY, referrals);

            // Create commission record
            const commissions = getItems<any>(AGENT_COMMISSIONS_KEY);
            commissions.push({
              id: generateId('com_'),
              agentId: agent.id,
              referredUserId: userId,
              referredName: depositor.fullName,
              depositAmount: amount,
              commissionRate,
              commissionAmount,
              createdAt: new Date().toISOString(),
            });
            saveItems(AGENT_COMMISSIONS_KEY, commissions);

            // Update agent stats
            const wallets = getItems<any>(WALLET_KEY);
            let agentWallet = wallets.find((w: any) => w.userId === agent.userId);
            if (!agentWallet) {
              agentWallet = { userId: agent.userId, main: 0, semWallet: 0, ongoing: 0 };
              wallets.push(agentWallet);
            }
            const agentMainBefore = agentWallet.main;
            agentWallet.main += commissionAmount;
            saveItems(WALLET_KEY, wallets);
            addWalletLedger(agent.userId, 'Main Wallet', 'Referral Commission', 'deposit_approval', depositId, commissionAmount, agentMainBefore, agentWallet.main);

            agent.totalCommission = (agent.totalCommission || 0) + commissionAmount;
            agent.qualifiedDeposits = (agent.qualifiedDeposits || 0) + 1;
            agent.availableBalance = (agent.availableBalance || 0) + commissionAmount;
            saveItems(AGENT_KEY, agents);

            // Record commission transaction
            const allTxs = getItems<any>(TX_KEY);
            allTxs.push({
              id: generateId('txn_'),
              userId: agent.userId,
              type: 'referral_commission',
              amount: commissionAmount,
              method: `Referral Commission - ${depositor.fullName}`,
              reference: 'REFCOM-' + depositId.slice(-8).toUpperCase(),
              status: 'success',
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            });
            saveItems(TX_KEY, allTxs);

            // Audit log
            addAuditLog(agent.userId, depositId, `Referral Commission Paid (${commissionRate*100}%)`, '0', commissionAmount.toString(), commissionAmount);
            addNotification(agent.userId, 'referral_commission', `You received ₱${commissionAmount.toLocaleString()} referral commission from ${depositor.fullName}'s deposit.`);
          }
        }
      }
    } catch {}

    // Notification
    addNotification(userId, 'deposit_approved', `Your deposit of ₱${amount.toLocaleString()} has been approved.`);
    if (bonus > 0) {
      addNotification(userId, 'bonus_credited', `You received a ${bonusType} of ₱${bonus.toLocaleString()}.`);
    }

    notifyDashboard();
    return { success: true };
  },

  // ==================== REJECT DEPOSIT ====================
  rejectDeposit(depositId: string, reason?: string): { success: boolean; error?: string } {
    const txs = getItems<any>(TX_KEY);
    const tx = txs.find((t: any) => t.id === depositId && t.type === 'deposit');
    
    if (!tx) return { success: false, error: 'Deposit not found.' };
    if (tx.status !== 'pending') return { success: false, error: 'Deposit has already been processed.' };

    const before = tx.status;
    const userId = tx.userId;
    const amount = tx.amount;

    tx.status = 'failed';
    tx.completedAt = new Date().toISOString();
    tx.approvedBy = getAdminInfo().name;
    tx.rejectionReason = reason || 'Rejected by administrator';
    saveItems(TX_KEY, txs);

    // No wallet changes on rejection

    // Transaction history already exists from the user's submission
    // Audit Log
    addAuditLog(userId, depositId, 'Deposit Rejected', before, 'failed', amount);

    // Notification
    addNotification(userId, 'deposit_rejected', `Your deposit of ₱${amount.toLocaleString()} has been rejected. Reason: ${reason || 'N/A'}`);

    notifyDashboard();
    return { success: true };
  },

  // ==================== EXPORT CSV ====================
  exportToCSV(deposits: DepositRecord[]): string {
    const headers = ['Transaction ID', 'Reference', 'User ID', 'Full Name', 'Email', 'Phone', 'Payment Method', 'Amount', 'Status', 'Submitted Date', 'Completed Date', 'Approved By', 'Rejection Reason', 'Bonus Applied', 'Bonus Type'];
    const rows = deposits.map(d => [
      d.id, d.reference, d.userId, d.userFullName, d.userEmail, d.userPhone,
      d.method, d.amount, d.status, d.createdAt, d.completedAt || '', d.approvedBy || '', d.rejectionReason || '', d.bonusApplied, d.bonusType,
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  },
};