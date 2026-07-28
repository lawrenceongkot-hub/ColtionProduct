import type { RegistrationFingerprint, WelcomeBonusClaim } from '../types';
import { apiService } from './api';

/**
 * Registration guard - all operations go through backend API.
 * No localStorage used.
 */

export const registrationGuard = {
  async isNameTaken(fullName: string): Promise<boolean> {
    try {
      const users = await apiService.get<any[]>('/admin/users');
      return users.some((u: any) => u.fullName?.toLowerCase() === fullName.toLowerCase());
    } catch {
      return false;
    }
  },

  async isEmailTaken(email: string): Promise<boolean> {
    try {
      const users = await apiService.get<any[]>('/admin/users');
      return users.some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    } catch {
      return false;
    }
  },

  async isPhoneTaken(phone: string): Promise<boolean> {
    try {
      const users = await apiService.get<any[]>('/admin/users');
      return users.some((u: any) => u.phone === phone);
    } catch {
      return false;
    }
  },

  async isWalletNumberTaken(walletNumber: string): Promise<boolean> {
    try {
      const wallets = await apiService.get<any[]>('/ewallets');
      return wallets.some((w: any) => w.walletNumber === walletNumber);
    } catch {
      return false;
    }
  },
};