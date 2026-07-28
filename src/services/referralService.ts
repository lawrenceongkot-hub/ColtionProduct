import type { ReferralStats, ReferralEntry } from '../types';
import { apiService } from './api';

/**
 * Referral service - reads from backend API.
 * Invitation codes are generated and stored server-side (private).
 */

/**
 * Get referral statistics for the current user from the API.
 */
export async function getReferralStatsAPI(invitationCode: string): Promise<ReferralStats> {
  try {
    const data = await apiService.get<any>('/referrals');
    return {
      referralCount: data.referralCount,
      totalEarnings: data.totalEarnings,
      recentReferrals: data.recentReferrals || [],
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