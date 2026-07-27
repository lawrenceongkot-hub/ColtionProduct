import type { ReferralStats, ReferralEntry, User } from '../types';

const REFERRALS_KEY = 'coltion_referrals';

interface ReferralRecord {
  id: string;
  inviterCode: string;
  referredUserId: string;
  referredName: string;
  referredEmail: string;
  joinedDate: string;
  status: 'active' | 'inactive';
}

function getReferrals(): ReferralRecord[] {
  try {
    const data = localStorage.getItem(REFERRALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveReferrals(referrals: ReferralRecord[]): void {
  localStorage.setItem(REFERRALS_KEY, JSON.stringify(referrals));
}

/**
 * Generate a secure random 8-character invitation code.
 * Uses crypto.getRandomValues for cryptographic randomness.
 */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Check if an invitation code already exists in the system.
 */
function isCodeTaken(code: string, existingCodes: string[]): boolean {
  return existingCodes.includes(code);
}

/**
 * Generate a unique invitation code that doesn't conflict with existing codes.
 */
export function generateUniqueCode(existingCodes: string[]): string {
  let code: string;
  let attempts = 0;
  do {
    code = generateInvitationCode();
    attempts++;
    // Safety: extremely unlikely to need more than a few attempts
    if (attempts > 100) {
      // Fallback: use timestamp-based generation
      code = 'X' + Date.now().toString(36).slice(-7).toUpperCase();
    }
  } while (isCodeTaken(code, existingCodes));
  return code;
}

/**
 * Get all existing invitation codes from the system.
 */
export function getAllInvitationCodes(): string[] {
  try {
    const usersData = localStorage.getItem('coltion_users');
    if (!usersData) return [];
    const users = JSON.parse(usersData);
    return users.map((u: any) => u.invitationCode).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Find a user by their invitation code.
 */
export function findUserByInvitationCode(code: string): User | null {
  try {
    const usersData = localStorage.getItem('coltion_users');
    if (!usersData) return null;
    const users = JSON.parse(usersData);
    const user = users.find((u: any) => u.invitationCode === code);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

/**
 * Get referral statistics for a user.
 */
export function getReferralStats(_userId: string, invitationCode: string): ReferralStats {
  const referrals = getReferrals();
  const userReferrals = referrals.filter(r => r.inviterCode === invitationCode);

  const recentReferrals: ReferralEntry[] = userReferrals
    .sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime())
    .slice(0, 10)
    .map(r => ({
      id: r.referredUserId,
      fullName: r.referredName,
      email: r.referredEmail,
      joinedDate: r.joinedDate,
      status: r.status,
    }));

  // Calculate total earnings from referral commissions
  let totalEarnings = 0;
  try {
    const txs = JSON.parse(localStorage.getItem('coltion_transactions') || '[]');
    // Find the user by invitation code to get their userId
    const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
    const user = users.find((u: any) => u.invitationCode === invitationCode);
    if (user) {
      totalEarnings = txs
        .filter((t: any) => t.userId === user.id && t.type === 'referral_commission' && t.status === 'success')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
    }
  } catch {}

  return {
    referralCount: userReferrals.length,
    totalEarnings,
    recentReferrals,
  };
}

/**
 * Record a new referral when a user registers with an invitation code.
 */
export function recordReferral(
  inviterCode: string,
  referredUserId: string,
  referredName: string,
  referredEmail: string
): void {
  const referrals = getReferrals();
  const record: ReferralRecord = {
    id: 'ref_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    inviterCode,
    referredUserId,
    referredName,
    referredEmail,
    joinedDate: new Date().toISOString(),
    status: 'active',
  };
  referrals.push(record);
  saveReferrals(referrals);

  // Update inviter's referral count
  try {
    const usersData = localStorage.getItem('coltion_users');
    if (usersData) {
      const users = JSON.parse(usersData);
      const inviter = users.find((u: any) => u.invitationCode === inviterCode);
      if (inviter) {
        inviter.referralCount = (inviter.referralCount || 0) + 1;
        localStorage.setItem('coltion_users', JSON.stringify(users));
      }
    }
  } catch {
    // Silently fail - referral is still recorded
  }
}

/**
 * Validate an invitation code format (8 chars, alphanumeric).
 */
export function isValidCodeFormat(code: string): boolean {
  return /^[A-Za-z0-9]{8}$/.test(code);
}