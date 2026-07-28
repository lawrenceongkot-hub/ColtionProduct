import { apiService } from './api';

/**
 * Settings enforcer - reads platform settings from backend API.
 * No localStorage used.
 */

interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  withdrawalsEnabled: boolean;
  withdrawalMaintenanceMessage: string;
  registrationEnabled: boolean;
  loginEnabled: boolean;
  referralCommissionPercent: number;
}

export const settingsEnforcer = {
  async getSettings(): Promise<PlatformSettings | null> {
    try {
      return await apiService.get<PlatformSettings>('/settings');
    } catch {
      return null;
    }
  },

  async isMaintenanceMode(): Promise<{ blocked: boolean; message: string }> {
    try {
      const settings = await this.getSettings();
      if (settings?.maintenanceMode) {
        return { blocked: true, message: settings.maintenanceMessage || 'Site is under maintenance.' };
      }
      return { blocked: false, message: '' };
    } catch {
      return { blocked: false, message: '' };
    }
  },

  async areWithdrawalsEnabled(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings?.withdrawalsEnabled !== false;
    } catch {
      return true;
    }
  },

  async getWithdrawalMaintenanceMessage(): Promise<string> {
    try {
      const settings = await this.getSettings();
      return settings?.withdrawalMaintenanceMessage || '';
    } catch {
      return '';
    }
  },

  async isRegistrationEnabled(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings?.registrationEnabled !== false;
    } catch {
      return true;
    }
  },

  async isLoginEnabled(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings?.loginEnabled !== false;
    } catch {
      return true;
    }
  },
};