import type { RegistrationFingerprint, WelcomeBonusClaim } from '../types';
import { walletService } from './walletService';

const FINGERPRINT_KEY = 'coltion_fingerprints';
const BONUS_KEY = 'coltion_welcome_bonuses';
const WELCOME_BONUS_AMOUNT = 100;

function getFingerprints(): RegistrationFingerprint[] {
  try { return JSON.parse(localStorage.getItem(FINGERPRINT_KEY) || '[]'); } catch { return []; }
}
function saveFingerprints(fps: RegistrationFingerprint[]): void {
  localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fps));
}
function getBonuses(): WelcomeBonusClaim[] {
  try { return JSON.parse(localStorage.getItem(BONUS_KEY) || '[]'); } catch { return []; }
}
function saveBonuses(bonuses: WelcomeBonusClaim[]): void {
  localStorage.setItem(BONUS_KEY, JSON.stringify(bonuses));
}

function getClientIp(): string {
  try {
    const nav = window.navigator;
    const combined = [
      nav.language || '', nav.platform || '',
      nav.userAgent?.substring(0, 30) || '',
      screen.width || '', screen.height || '',
    ].join('|');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return [
      Math.abs(hash) % 256, Math.abs(hash >> 8) % 256,
      Math.abs(hash >> 16) % 256, Math.abs(hash >> 24) % 256,
    ].join('.');
  } catch { return '0.0.0.0'; }
}

function getDeviceFingerprint(): string {
  try {
    const nav = window.navigator;
    const combined = [
      nav.userAgent || '', nav.language || '', nav.platform || '',
      screen.width || '', screen.height || '', screen.colorDepth || '',
      new Date().getTimezoneOffset().toString(),
      !!navigator.hardwareConcurrency ? navigator.hardwareConcurrency.toString() : '',
    ].join('|||');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'dev_' + Math.abs(hash).toString(36).substring(0, 16);
  } catch { return 'dev_unknown'; }
}

export const registrationGuard = {
  getClientIp,
  getDeviceFingerprint,

  isNameTaken(name: string): boolean {
    try {
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      return users.some((u: any) =>
        u.fullName?.toLowerCase().trim() === name.toLowerCase().trim()
      );
    } catch { return false; }
  },

  isEmailTaken(email: string): boolean {
    try {
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      return users.some((u: any) =>
        u.email?.toLowerCase().trim() === email.toLowerCase().trim()
      );
    } catch { return false; }
  },

  isPhoneTaken(phone: string): boolean {
    try {
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      return users.some((u: any) => u.phone === phone);
    } catch { return false; }
  },

  hasClaimedBonus(ip: string, deviceFp: string): boolean {
    const fingerprints = getFingerprints();
    return fingerprints.some(f =>
      (f.ipAddress === ip) || (f.deviceFingerprint === deviceFp)
    );
  },

  recordFingerprint(userId: string, fullName: string): void {
    const fingerprints = getFingerprints();
    fingerprints.push({
      userId, fullName,
      ipAddress: getClientIp(),
      deviceFingerprint: getDeviceFingerprint(),
      createdAt: new Date().toISOString(),
    });
    saveFingerprints(fingerprints);
  },

  /** Award welcome bonus with NO checks - for brand new users only. */
  awardWelcomeBonusBypass(userId: string): boolean {
    const bonuses = getBonuses();
    if (bonuses.some(b => b.userId === userId && b.status === 'CLAIMED')) {
      return false; // Already received
    }

    const ip = getClientIp();
    const deviceFp = getDeviceFingerprint();

    const bonus: WelcomeBonusClaim = {
      id: 'bonus_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      userId, amount: WELCOME_BONUS_AMOUNT,
      ipAddress: ip, deviceFingerprint: deviceFp,
      status: 'CLAIMED',
      createdAt: new Date().toISOString(),
    };
    bonuses.push(bonus);
    saveBonuses(bonuses);

    // Credit SemWallet
    walletService.depositSemWallet(userId, WELCOME_BONUS_AMOUNT);

    // Create wallet ledger entry
    try {
      const WALLET_LEDGER_KEY = 'coltion_wallet_ledger';
      const balances = walletService.getBalancesSync(userId);
      const ledger = JSON.parse(localStorage.getItem(WALLET_LEDGER_KEY) || '[]');
      ledger.push({
        id: 'led_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId, walletType: 'SemWallet', transactionType: 'Welcome Bonus',
        referenceType: 'registration', referenceId: userId,
        amount: WELCOME_BONUS_AMOUNT,
        balanceBefore: balances.semWallet - WELCOME_BONUS_AMOUNT,
        balanceAfter: balances.semWallet,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(WALLET_LEDGER_KEY, JSON.stringify(ledger));
    } catch { /* silent */ }

    // Create transaction history
    try {
      const TX_KEY = 'coltion_transactions';
      const txs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
      txs.push({
        id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId, type: 'welcome_bonus', amount: WELCOME_BONUS_AMOUNT,
        method: 'WELCOME BONUS',
        reference: 'WELCOME-' + userId.slice(-8).toUpperCase(),
        status: 'success',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      localStorage.setItem(TX_KEY, JSON.stringify(txs));
    } catch { /* silent */ }

    return true;
  },

  /** Original method - checks IP/device before awarding. */
  awardWelcomeBonus(userId: string, ip: string, deviceFp: string): boolean {
    if (this.hasClaimedBonus(ip, deviceFp)) return false;
    return this.awardWelcomeBonusBypass(userId);
  },

  isEwalletTaken(walletNumber: string): boolean {
    try {
      const wallets = JSON.parse(localStorage.getItem('coltion_ewallets') || '[]');
      return wallets.some((w: any) => w.walletNumber === walletNumber);
    } catch { return false; }
  },
};