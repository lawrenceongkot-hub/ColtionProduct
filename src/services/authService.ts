import type { User } from '../types';
import { apiService } from './api';

/**
 * Auth service - all operations go through backend API.
 * No localStorage used. Invitation codes are managed server-side (private).
 */

export const authService = {
  async getSession(): Promise<User | null> {
    try {
      const user = await apiService.get<User>('/auth/me');
      return user;
    } catch {
      return null;
    }
  },

  logout(): void {
    // Tokens are cleared by AuthContext, no localStorage to clean
  },

  clearAllData(): void {
    // No localStorage data to clear anymore
  },
};