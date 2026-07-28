import type { VerificationRequest } from '../types';
import { apiService } from './api';

/**
 * Verification service - all operations go through backend API.
 * No localStorage used.
 */

export const verificationService = {
  async getRequest(userId: string): Promise<VerificationRequest | null> {
    try {
      const requests = await apiService.get<VerificationRequest[]>('/verification');
      return requests.length > 0 ? requests[0] : null;
    } catch {
      return null;
    }
  },

  async hasPendingRequest(userId: string): Promise<boolean> {
    const req = await this.getRequest(userId);
    return req !== null && req.status === 'PENDING';
  },

  async isVerified(userId: string): Promise<boolean> {
    const req = await this.getRequest(userId);
    return req !== null && req.status === 'APPROVED';
  },

  async createRequest(userId: string, email: string, mobileNumber: string): Promise<VerificationRequest | null> {
    try {
      const result = await apiService.post<any>('/verification', { email, mobileNumber });
      return result;
    } catch {
      return null;
    }
  },
};