import type { VerificationRequest } from '../types';
import { apiService } from './api';

/**
 * Verification service - all operations go through backend API.
 * No localStorage used.
 * The verification code is ALWAYS generated server-side and stored in the database.
 */

export interface VerificationStatus {
  userId: string;
  email: string;
  mobileNumber: string;
  verificationCode: string | null;
  status: string;
  verifiedAt: string | null;
  requestedAt: string | null;
}

/** Result wrapper that preserves the exact backend error message */
export interface VerifyResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function isMobileValid(mobile: string): boolean {
  // Philippines format: starts with 09, exactly 11 digits
  return /^09\d{9}$/.test(mobile);
}

export const verificationService = {
  /**
   * Get the user's current verification status and code (if exists).
   * Never generates a new code — only reads from the database.
   */
  async getStatus(userId: string): Promise<VerificationStatus | null> {
    try {
      console.log('=== VERIFY STEP 1: getStatus(apiService.get /verification)');
      const data = await apiService.get<VerificationStatus>('/verification');
      console.log('=== VERIFY STEP 2: getStatus success', JSON.stringify(data));
      return data;
    } catch (e: any) {
      console.error('=== VERIFY STEP 2: getStatus failed', e?.message || e);
      return null;
    }
  },

  /**
   * Generate a verification code (server-side only).
   * If a code already exists in the database, returns the existing code.
   * Preserves the exact backend error message instead of returning null.
   */
  async generateCode(mobileNumber?: string): Promise<VerifyResult<VerificationStatus>> {
    console.log('=== VERIFY STEP 1: generateCode called, mobileNumber =', mobileNumber || '(none)');

    // Client-side validation FIRST
    if (!mobileNumber) {
      console.error('=== VERIFY STEP 1b: Mobile number is required.');
      return { ok: false, error: 'Mobile number is required.' };
    }
    if (!isMobileValid(mobileNumber)) {
      console.error('=== VERIFY STEP 1b: Invalid mobile number format.');
      return { ok: false, error: 'Please enter a valid 11-digit mobile number (e.g., 09171234567).' };
    }

    try {
      console.log('=== VERIFY STEP 3: Sending POST /api/verification');
      const data = await apiService.post<VerificationStatus>('/verification', { mobileNumber });
      console.log('=== VERIFY STEP 4: Backend returned success', JSON.stringify(data));
      return { ok: true, data };
    } catch (e: any) {
      console.error('=== VERIFY STEP 4: Backend returned error', e?.message || e);
      // Preserve the EXACT backend error message
      return { ok: false, error: e?.message || 'Unable to generate verification code.' };
    }
  },

  /** Check if the user is verified */
  async isVerified(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status?.status === 'APPROVED';
  },

  /** Check if the user has a pending verification */
  async hasPendingRequest(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status?.status === 'PENDING';
  },

  /** Legacy getRequest for compatibility */
  async getRequest(userId: string): Promise<VerificationRequest | null> {
    const status = await this.getStatus(userId);
    if (!status) return null;
    return {
      id: status.userId,
      userId: status.userId,
      email: status.email,
      mobileNumber: status.mobileNumber,
      verificationCode: status.verificationCode || '',
      status: (status.status as VerificationRequest['status']) || 'PENDING',
      createdAt: status.requestedAt || new Date().toISOString(),
      updatedAt: status.requestedAt || new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },

  /** Legacy createRequest for compatibility */
  async createRequest(userId: string, email: string, mobileNumber: string): Promise<VerificationRequest | null> {
    const result = await this.generateCode(mobileNumber);
    if (!result.ok || !result.data) return null;
    const status = result.data;
    return {
      id: status.userId,
      userId: status.userId,
      email: status.email,
      mobileNumber: status.mobileNumber,
      verificationCode: status.verificationCode || '',
      status: (status.status as VerificationRequest['status']) || 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};