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

export const verificationService = {
  /**
   * Get the user's current verification status and code (if exists).
   * Never generates a new code — only reads from the database.
   */
  async getStatus(userId: string): Promise<VerificationStatus | null> {
    try {
      return await apiService.get<VerificationStatus>('/verification');
    } catch {
      return null;
    }
  },

  /**
   * Generate a verification code (server-side only).
   * If a code already exists in the database, returns the existing code.
   */
  async generateCode(mobileNumber?: string): Promise<VerificationStatus | null> {
    try {
      return await apiService.post<VerificationStatus>('/verification', mobileNumber ? { mobileNumber } : {});
    } catch {
      return null;
    }
  },

  /** Check if the user has a verification code already */
  async hasVerificationCode(userId: string): Promise<boolean> {
    const status = await this.getStatus(userId);
    return !!(status?.verificationCode);
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

  /**
   * Legacy method for compatibility.
   * Returns the verification request from the database or null.
   */
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

  /**
   * Legacy method for compatibility.
   * Creates a verification request via the backend.
   */
  async createRequest(userId: string, email: string, mobileNumber: string): Promise<VerificationRequest | null> {
    const status = await this.generateCode(mobileNumber);
    if (!status) return null;
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