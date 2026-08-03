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
    // Fallback: derive total from recentReferrals array if stats not present (older backend)
    const recentReferrals: ReferralEntry[] = data.recentReferrals || [];
    const totalReferrals = stats.totalReferrals ?? stats.referralCount ?? recentReferrals.length ?? 0;
    return {
      referralCount: totalReferrals,
      totalEarnings: stats.totalCommissionEarned ?? stats.totalEarnings ?? data.totalEarnings ?? 0,
      recentReferrals,
      totalReferrals,
      verifiedReferrals: stats.verifiedReferrals ?? recentReferrals.filter((r: any) => r.isVerified).length,
      activeReferrals: stats.activeReferrals ?? recentReferrals.filter((r: any) => r.isActive).length,
      depositedReferrals: stats.depositedReferrals ?? recentReferrals.filter((r: any) => r.hasDeposit).length,
      totalDepositAmount: stats.totalDepositAmount ?? recentReferrals.reduce((s: number, r: any) => s + (r.totalDeposit || 0), 0),
      totalCommissionEarned: stats.totalCommissionEarned ?? stats.totalEarnings ?? 0,
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