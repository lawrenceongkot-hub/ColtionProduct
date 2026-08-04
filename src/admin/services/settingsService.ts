import { adminApi } from './adminApi';

export interface PlatformSettings {
  websiteName: string;
  websiteDescription: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  footerCopyright: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralCommissionPercent: number;
  paymentMethods: any;
  withdrawalsEnabled: boolean;
  withdrawalMaintenanceMessage: string;
  registrationEnabled: boolean;
  loginEnabled: boolean;
  maxLoginAttempts: number;
  lockDurationMinutes: number;
  id?: string;
  ipWhitelistEnabled: boolean;
  ipWhitelist: any[];
  ipBlacklist: any[];
  blockedCountryMessage: string;
  countryRestrictions: Record<string, boolean>;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  twoFactorEnabled: boolean;
  emailVerificationRequired: boolean;
  mobileVerificationRequired: boolean;
  maxUploadSizeMB: number;
  allowedImageTypes: string;
  allowedDocumentTypes: string;
  maxVerificationFileSizeMB: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  adminNotifications: boolean;
  referralNotifications: boolean;
  investmentNotifications: boolean;
  depositNotifications: boolean;
  withdrawalNotifications: boolean;
  // Landing Page Statistics Controls
  landingTotalUsersDisplay: number;
  landingTotalInvestmentsDisplay: number;
  landingLatestInvestorCount: number;
  landingEnableLiveCounter: boolean;
  landingEnableAnimatedNumbers: boolean;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  websiteName: 'Coltion Product Investment',
  websiteDescription: 'Premium Investment Platform',
  supportEmail: 'support@coltionproduct.com',
  supportPhone: '+63 900 000 0000',
  companyAddress: 'Metro Manila, Philippines',
  footerCopyright: '© 2026 Coltion Product Investment. All rights reserved.',
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance.',
  referralCommissionPercent: 30,
  paymentMethods: { GCash: true, Maya: true, QRPH: true },
  withdrawalsEnabled: true,
  withdrawalMaintenanceMessage: 'Withdrawals temporarily unavailable.',
  registrationEnabled: true,
  loginEnabled: true,
  maxLoginAttempts: 5,
  lockDurationMinutes: 30,
  ipWhitelist: [],
  ipBlacklist: [],
  ipWhitelistEnabled: false,
  blockedCountryMessage: 'Service unavailable in your country.',
  countryRestrictions: {},
  sessionTimeoutMinutes: 60,
  passwordMinLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  twoFactorEnabled: false,
  emailVerificationRequired: true,
  mobileVerificationRequired: true,
  maxUploadSizeMB: 10,
  allowedImageTypes: 'jpg,png,svg,webp',
  allowedDocumentTypes: 'pdf,doc,docx',
  maxVerificationFileSizeMB: 5,
  emailNotifications: true,
  smsNotifications: true,
  inAppNotifications: true,
  adminNotifications: true,
  referralNotifications: true,
  investmentNotifications: true,
  depositNotifications: true,
  withdrawalNotifications: true,
  // Landing Page Statistics
  landingTotalUsersDisplay: 0,
  landingTotalInvestmentsDisplay: 0,
  landingLatestInvestorCount: 5,
  landingEnableLiveCounter: true,
  landingEnableAnimatedNumbers: true,
};

export const settingsService = {
  async getSettings(): Promise<PlatformSettings> {
    try {
      const s = await adminApi.getSettings();
      if (!s) return { ...DEFAULT_SETTINGS };
      // Normalize array fields that come back as strings
      return {
        ...DEFAULT_SETTINGS,
        ...s,
        paymentMethods: typeof s.paymentMethods === 'string' ? JSON.parse(s.paymentMethods || '{}') : (s.paymentMethods || { GCash: true, Maya: true, QRPH: true }),
        ipWhitelist: Array.isArray(s.ipWhitelist) ? s.ipWhitelist : (typeof s.ipWhitelist === 'string' ? JSON.parse(s.ipWhitelist || '[]') : []),
        ipBlacklist: Array.isArray(s.ipBlacklist) ? s.ipBlacklist : (typeof s.ipBlacklist === 'string' ? JSON.parse(s.ipBlacklist || '[]') : []),
        countryRestrictions: typeof s.countryRestrictions === 'string' ? JSON.parse(s.countryRestrictions || '{}') : (s.countryRestrictions || {}),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  async updateSettings(settings: any): Promise<boolean> {
    try {
      await adminApi.updateSettings(settings);
      return true;
    } catch {
      return false;
    }
  },

  /** Pick the exact fields the backend PlatformSettings model accepts */
  async saveSettings(settings: any): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = Object.fromEntries(
        Object.entries(settings).filter(([k]) =>
          [
            'websiteName','websiteDescription','supportEmail','supportPhone','companyAddress',
            'footerCopyright','maintenanceMode','maintenanceMessage','referralCommissionPercent',
            'paymentMethods','withdrawalsEnabled','withdrawalMaintenanceMessage','registrationEnabled',
            'loginEnabled','maxLoginAttempts','lockDurationMinutes','ipWhitelistEnabled','ipWhitelist',
            'ipBlacklist','countryRestrictions','blockedCountryMessage','sessionTimeoutMinutes',
            'passwordMinLength','requireUppercase','requireLowercase','requireNumber','requireSpecialChar',
            'rememberMeDays','twoFactorEnabled','emailVerificationRequired','mobileVerificationRequired',
            'maxUploadSizeMB','allowedImageTypes','allowedDocumentTypes','maxVerificationFileSizeMB',
            'landingTotalUsersDisplay','landingTotalInvestmentsDisplay','landingLatestInvestorCount',
            'landingEnableLiveCounter','landingEnableAnimatedNumbers',
          ].includes(k)
        )
      );
      // Serialize complex fields for storage
      if (typeof payload.paymentMethods === 'object') payload.paymentMethods = JSON.stringify(payload.paymentMethods);
      if (Array.isArray(payload.ipWhitelist)) payload.ipWhitelist = JSON.stringify(payload.ipWhitelist);
      if (Array.isArray(payload.ipBlacklist)) payload.ipBlacklist = JSON.stringify(payload.ipBlacklist);
      await adminApi.updateSettings(payload);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save settings' };
    }
  },
};