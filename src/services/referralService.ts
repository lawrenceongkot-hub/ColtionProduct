import type { ReferralStats, ReferralEntry } from '../types';
import { apiService } from './api';

/**
 * Referral service - reads from backend API.
 * Invitation codes are generated and stored server-side (private).
 */

/**
 * Get referral statistics for the current user from the API.
 * Single source of truth: /api/referrals returns { stats, recentReferrals } from PostgreSQL.
 */
export async function getReferralStatsAPI(invitationCode: string): Promise<ReferralStats> {
  try {
    const data = await apiService.get<any>('/referrals');
    const stats = data.stats || {};
    return {
      referralCount: stats.totalReferrals ?? stats.referralCount ?? 0,
      totalEarnings: stats.totalCommissionEarned ?? stats.totalEarnings ?? 0,
      recentReferrals: data.recentReferrals || [],
      totalReferrals: stats.totalReferrals ?? 0,
      verifiedReferrals: stats.verifiedReferrals ?? 0,
      activeReferrals: stats.activeReferrals ?? 0,
      depositedReferrals: stats.depositedReferrals ?? 0,
      totalDepositAmount: stats.totalDepositAmount ?? 0,
      totalCommissionEarned: stats.totalCommissionEarned ?? 0,
      pendingCommission: stats.pendingCommission ?? 0,
      paidCommission: stats.paidCommission ?? 0,
    };
  } catch {
    return { referralCount: 0, totalEarnings: 0, recentReferrals: [] };
  }
}

/**
 * Get all invitation codes from the server.
 * For validation purposes only (e.g., checking referral code on register).
 */
export async function getAllInvitationCodesAPI(): Promise<string[]> {
  try {
    const users = await apiService.get<any[]>('/admin/users');
    return users.map((u: any) => u.invitationCode).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Validate an invitation code format (8 chars, alphanumeric).
 */
export function isValidCodeFormat(code: string): boolean {
  return /^[A-Za-z0-9]{8}$/.test(code);
}