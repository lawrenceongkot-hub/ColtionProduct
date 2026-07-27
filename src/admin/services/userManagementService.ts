import type { User, Transaction, VerificationRequest } from '../../types';
import { verificationService } from '../../services/verificationService';

const USERS_KEY = 'coltion_users';
const TX_KEY = 'coltion_transactions';
const WALLET_KEY = 'coltion_wallets';
const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';
const VERIFICATION_KEY = 'coltion_verifications';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const SESSION_KEY = 'coltion_session';
const ADMIN_SESSION_KEY = 'coltion_admin_session';

// ==================== AUDIT LOG ====================
interface AuditEntry {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  userId: string;
  action: string;
  beforeValue: string;
  afterValue: string;
  timestamp: string;
  ipAddress: string;
}

function getItems<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
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
    if (data) {
      const admin = JSON.parse(data);
      return { id: admin.id, name: admin.name, role: admin.role };
    }
  } catch {}
  return { id: 'unknown', name: 'Unknown Admin', role: 'unknown' };
}

function addAuditLog(
  userId: string, action: string, beforeValue: string, afterValue: string
): void {
  const admin = getAdminInfo();
  const logs = getItems<AuditEntry>(AUDIT_LOG_KEY);
  logs.unshift({
    id: generateId('aud_'),
    adminId: admin.id,
    adminName: admin.name,
    adminRole: admin.role,
    userId,
    action,
    beforeValue,
    afterValue,
    timestamp: new Date().toISOString(),
    ipAddress: '127.0.0.1',
  });
  // Keep last 1000 entries
  if (logs.length > 1000) logs.length = 1000;
  saveItems(AUDIT_LOG_KEY, logs);
}

// ==================== WALLET LEDGER ====================
function addWalletLedger(
  userId: string, walletType: string, transactionType: string,
  referenceType: string, referenceId: string,
  amount: number, balanceBefore: number, balanceAfter: number
): void {
  const ledger = getItems<any>(WALLET_LEDGER_KEY);
  ledger.push({
    id: generateId('led_'),
    userId, walletType, transactionType, referenceType, referenceId,
    amount, balanceBefore, balanceAfter,
    createdAt: new Date().toISOString(),
  });
  saveItems(WALLET_LEDGER_KEY, ledger);
}

// ==================== TRANSACTION HISTORY ====================
function addTransaction(
  userId: string, type: Transaction['type'], amount: number,
  method: string, reference: string, status: Transaction['status']
): void {
  const txs = getItems<Transaction>(TX_KEY);
  txs.push({
    id: generateId('txn_'),
    userId, type, amount, method, reference, status,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    walletNumber: undefined,
  });
  saveItems(TX_KEY, txs);
}

// ==================== USER MANAGEMENT SERVICE ====================
export const userManagementService = {
  // ==================== USER LIST ====================
  getUsers() {
    const users = getItems<any>(USERS_KEY);
    const verifications = getItems<VerificationRequest>(VERIFICATION_KEY);
    const wallets = getItems<any>(WALLET_KEY);
    const txs = getItems<Transaction>(TX_KEY);

    return users.map((u: any) => {
      const userVerifications = verifications.filter((v: VerificationRequest) => v.userId === u.id);
      const latestVer = userVerifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const wallet = wallets.find((w: any) => w.userId === u.id);
      const userTxs = txs.filter((t: Transaction) => t.userId === u.id);

      const lastLoginTx = userTxs.filter(t => t.type === 'deposit' || t.type === 'withdrawal')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: u.id,
        displayId: u.displayId || u.id.slice(0, 10),
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status || 'active',
        verificationStatus: latestVer?.status || 'NONE',
        emailVerified: latestVer?.status === 'APPROVED' ? u.email : null,
        phoneVerified: latestVer?.status === 'APPROVED' ? u.phone : null,
        registrationDate: new Date(u.createdAt).toISOString(),
        lastLogin: lastLoginTx?.createdAt || new Date(u.createdAt).toISOString(),
        lastLoginIp: u.lastLoginIp || '-',
        device: u.device || '-',
        referralCode: u.invitationCode || '-',
        referredBy: u.invitedBy || '-',
        createdAt: u.createdAt,
        wallet: wallet || { userId: u.id, main: 0, semWallet: 0, ongoing: 0 },
        kycStatus: latestVer?.status || 'NONE',
      };
    });
  },

  // ==================== USER SEARCH ====================
  searchUsers(query: string, users: any[]): any[] {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u: any) =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.displayId || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q) ||
      (u.referralCode || '').toLowerCase().includes(q) ||
      (u.referredBy || '').toLowerCase().includes(q)
    );
  },

  // ==================== WALLET OPERATIONS ====================
  addMainWallet(userId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet) return false;

    const before = wallet.main;
    wallet.main += amount;
    saveItems(WALLET_KEY, wallets);

    addWalletLedger(userId, 'Main Wallet', 'Admin Adjustment', 'admin_add', userId, amount, before, wallet.main);
    addTransaction(userId, 'deposit', amount, 'Admin Adjustment', 'ADM-' + generateId('').slice(-8).toUpperCase(), 'success');
    addAuditLog(userId, `Add Main Wallet (+${amount})`, `Main: ${before}`, `Main: ${wallet.main}`);
    notifyDashboard();
    return true;
  },

  deductMainWallet(userId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet || wallet.main < amount) return false;

    const before = wallet.main;
    wallet.main -= amount;
    saveItems(WALLET_KEY, wallets);

    addWalletLedger(userId, 'Main Wallet', 'Admin Deduction', 'admin_deduct', userId, -amount, before, wallet.main);
    addTransaction(userId, 'withdrawal', amount, 'Admin Deduction', 'ADM-' + generateId('').slice(-8).toUpperCase(), 'success');
    addAuditLog(userId, `Deduct Main Wallet (-${amount})`, `Main: ${before}`, `Main: ${wallet.main}`);
    notifyDashboard();
    return true;
  },

  addSemWallet(userId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet) return false;

    const before = wallet.semWallet;
    wallet.semWallet += amount;
    saveItems(WALLET_KEY, wallets);

    addWalletLedger(userId, 'SemWallet', 'Admin Adjustment', 'admin_add', userId, amount, before, wallet.semWallet);
    addTransaction(userId, 'wallet_transfer', amount, 'SemWallet Admin Credit', 'ADM-' + generateId('').slice(-8).toUpperCase(), 'success');
    addAuditLog(userId, `Add SemWallet (+${amount})`, `SemWallet: ${before}`, `SemWallet: ${wallet.semWallet}`);
    notifyDashboard();
    return true;
  },

  deductSemWallet(userId: string, amount: number): boolean {
    if (amount <= 0) return false;
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet || wallet.semWallet < amount) return false;

    const before = wallet.semWallet;
    wallet.semWallet -= amount;
    saveItems(WALLET_KEY, wallets);

    addWalletLedger(userId, 'SemWallet', 'Admin Deduction', 'admin_deduct', userId, -amount, before, wallet.semWallet);
    addTransaction(userId, 'wallet_transfer', amount, 'SemWallet Admin Debit', 'ADM-' + generateId('').slice(-8).toUpperCase(), 'success');
    addAuditLog(userId, `Deduct SemWallet (-${amount})`, `SemWallet: ${before}`, `SemWallet: ${wallet.semWallet}`);
    notifyDashboard();
    return true;
  },

  getWalletBalances(userId: string): { main: number; semWallet: number; ongoing: number } {
    const wallets = getItems<any>(WALLET_KEY);
    const wallet = wallets.find((w: any) => w.userId === userId);
    if (!wallet) return { main: 0, semWallet: 0, ongoing: 0 };

    // Calculate ongoing wallet from active investment orders
    const orders = getItems<any>('coltion_orders');
    const activeOrders = orders.filter((o: any) => o.userId === userId && o.status === 'active');
    const ongoing = activeOrders.reduce((sum: number, o: any) => sum + (o.currentProfit || 0), 0);

    return {
      main: wallet.main || 0,
      semWallet: wallet.semWallet || 0,
      ongoing,
    };
  },

  // ==================== VERIFICATION ====================
  verifyEmail(userId: string): void {
    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return;
    addAuditLog(userId, 'Email Verified', 'unverified', 'verified');
    notifyDashboard();
  },

  unverifyEmail(userId: string): void {
    addAuditLog(userId, 'Email Unverified', 'verified', 'unverified');
    notifyDashboard();
  },

  verifyPhone(userId: string): void {
    addAuditLog(userId, 'Phone Verified', 'unverified', 'verified');
    notifyDashboard();
  },

  unverifyPhone(userId: string): void {
    addAuditLog(userId, 'Phone Unverified', 'verified', 'unverified');
    notifyDashboard();
  },

  approveKYC(userId: string): boolean {
    const verifications = getItems<VerificationRequest>(VERIFICATION_KEY);
    const req = verifications
      .filter(v => v.userId === userId && v.status === 'PENDING')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!req) return false;

    const before = req.status;
    req.status = 'APPROVED';
    req.updatedAt = new Date().toISOString();
    saveItems(VERIFICATION_KEY, verifications);

    addAuditLog(userId, 'KYC Approved', before, 'APPROVED');
    notifyDashboard();
    return true;
  },

  rejectKYC(userId: string): boolean {
    const verifications = getItems<VerificationRequest>(VERIFICATION_KEY);
    const req = verifications
      .filter(v => v.userId === userId && v.status === 'PENDING')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!req) return false;

    const before = req.status;
    req.status = 'REJECTED';
    req.updatedAt = new Date().toISOString();
    saveItems(VERIFICATION_KEY, verifications);

    addAuditLog(userId, 'KYC Rejected', before, 'REJECTED');
    notifyDashboard();
    return true;
  },

  getVerificationStatus(userId: string): { email: string; phone: string; kyc: string } {
    const verifications = getItems<VerificationRequest>(VERIFICATION_KEY);
    const userVerifications = verifications
      .filter(v => v.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = userVerifications[0];
    return {
      email: latest?.email || '-',
      phone: latest?.mobileNumber || '-',
      kyc: latest?.status || 'NONE',
    };
  },

  // ==================== ACCOUNT MANAGEMENT ====================
  banUser(userId: string): boolean {
    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const before = user.status || 'active';
    user.status = 'banned';
    saveItems(USERS_KEY, users);

    // Force logout: remove session
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      if (session.id === userId) {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}

    addAuditLog(userId, 'Account Banned', before, 'banned');
    notifyDashboard();
    return true;
  },

  unbanUser(userId: string): boolean {
    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const before = user.status || 'banned';
    user.status = 'active';
    saveItems(USERS_KEY, users);

    addAuditLog(userId, 'Account Unbanned', before, 'active');
    notifyDashboard();
    return true;
  },

  suspendUser(userId: string): boolean {
    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const before = user.status || 'active';
    user.status = 'suspended';
    saveItems(USERS_KEY, users);

    addAuditLog(userId, 'Account Suspended', before, 'suspended');
    notifyDashboard();
    return true;
  },

  activateUser(userId: string): boolean {
    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const before = user.status || 'suspended';
    user.status = 'active';
    saveItems(USERS_KEY, users);

    addAuditLog(userId, 'Account Activated', before, 'active');
    notifyDashboard();
    return true;
  },

  forceLogout(userId: string): boolean {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      if (session.id === userId) {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}

    addAuditLog(userId, 'Force Logout', 'session active', 'session destroyed');
    notifyDashboard();
    return true;
  },

  changePassword(userId: string, newPassword: string): boolean {
    if (!newPassword || newPassword.length < 6) return false;

    const users = getItems<any>(USERS_KEY);
    const user = users.find((u: any) => u.id === userId);
    if (!user) return false;

    const before = 'password hidden';
    user.password = newPassword;
    saveItems(USERS_KEY, users);

    // Force logout all sessions
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
      if (session.id === userId) {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}

    addAuditLog(userId, 'Password Changed', before, 'password updated');
    notifyDashboard();
    return true;
  },

  // ==================== AUDIT LOG ====================
  getAuditLog(userId?: string): AuditEntry[] {
    const logs = getItems<AuditEntry>(AUDIT_LOG_KEY);
    if (userId) return logs.filter(l => l.userId === userId);
    return logs;
  },

  // ==================== EXPORT ====================
  exportToCSV(users: any[]): string {
    const headers = [
      'Internal ID', 'Display ID', 'Full Name', 'Email', 'Phone',
      'Status', 'Verification', 'Registration Date', 'Last Login',
      'Last Login IP', 'Device', 'Referral Code', 'Referred By',
      'Main Wallet', 'SemWallet', 'Ongoing Wallet',
    ];
    const rows = users.map((u: any) => [
      u.id, u.displayId, u.fullName, u.email, u.phone,
      u.status, u.kycStatus, u.registrationDate, u.lastLogin,
      u.lastLoginIp, u.device, u.referralCode, u.referredBy,
      u.wallet?.main || 0, u.wallet?.semWallet || 0, (u.wallet?.ongoing || 0),
    ].join(','));
    return headers.join(',') + '\n' + rows.join('\n');
  },
};