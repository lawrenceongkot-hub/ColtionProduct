import type { VerificationRequest } from '../types';

const VERIFICATION_KEY = 'coltion_verifications';

function getRequests(): VerificationRequest[] {
  try {
    const data = localStorage.getItem(VERIFICATION_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRequests(requests: VerificationRequest[]): void {
  localStorage.setItem(VERIFICATION_KEY, JSON.stringify(requests));
}

/**
 * Generate a cryptographically random 15-character verification code.
 * Combination of uppercase, lowercase, and numbers.
 */
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(15);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 15; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export const verificationService = {
  /**
   * Get the current verification status for a user.
   * Returns the latest request or null if none exists.
   */
  getRequest(userId: string): VerificationRequest | null {
    const requests = getRequests();
    const userRequests = requests
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userRequests[0] || null;
  },

  /**
   * Check if user has a pending verification request.
   */
  hasPendingRequest(userId: string): boolean {
    const req = this.getRequest(userId);
    return req !== null && req.status === 'PENDING';
  },

  /**
   * Check if user is already verified.
   */
  isVerified(userId: string): boolean {
    const req = this.getRequest(userId);
    return req !== null && req.status === 'APPROVED';
  },

  /**
   * Create a new verification request for a user.
   * Returns null if user already has a pending request or is already verified.
   */
  createRequest(userId: string, email: string, mobileNumber: string): VerificationRequest | null {
    // Check for existing pending request
    if (this.hasPendingRequest(userId)) {
      return null;
    }

    // Check if already verified
    if (this.isVerified(userId)) {
      return null;
    }

    const requests = getRequests();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const request: VerificationRequest = {
      id: 'ver_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      userId,
      email,
      mobileNumber,
      verificationCode: generateVerificationCode(),
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    requests.push(request);
    saveRequests(requests);
    return request;
  },

  /**
   * Approve a verification request (for future BackOffice use).
   */
  approveRequest(requestId: string): void {
    const requests = getRequests();
    const req = requests.find(r => r.id === requestId);
    if (req && req.status === 'PENDING') {
      req.status = 'APPROVED';
      req.updatedAt = new Date().toISOString();
      saveRequests(requests);
      try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
    }
  },

  /**
   * Reject a verification request (for future BackOffice use).
   */
  rejectRequest(requestId: string): void {
    const requests = getRequests();
    const req = requests.find(r => r.id === requestId);
    if (req && req.status === 'PENDING') {
      req.status = 'REJECTED';
      req.updatedAt = new Date().toISOString();
      saveRequests(requests);
      try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
    }
  },

  /**
   * Clean up expired requests.
   */
  cleanupExpired(): void {
    const requests = getRequests();
    const now = new Date();
    const filtered = requests.filter(r => {
      if (r.status === 'PENDING' && new Date(r.expiresAt) < now) {
        r.status = 'REJECTED';
        r.updatedAt = now.toISOString();
        return true; // Keep it but mark as rejected
      }
      return true;
    });
    saveRequests(filtered);
  },
};