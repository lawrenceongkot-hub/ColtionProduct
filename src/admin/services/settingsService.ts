const SETTINGS_KEY = 'coltion_settings';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const ADMIN_SESSION_KEY = 'coltion_admin_session';

export interface PlatformSettings {
  // Website Info
  websiteName: string;
  websiteDescription: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  footerCopyright: string;
  websiteLogo: string;
  websiteFavicon: string;
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  // Referral
  referralCommissionPercent: number;
  // Payment Methods
  paymentMethods: Record<string, boolean>;
  // Withdrawal
  withdrawalsEnabled: boolean;
  withdrawalMaintenanceMessage: string;
  // Registration & Login
  registrationEnabled: boolean;
  loginEnabled: boolean;
  // Login Attempt
  maxLoginAttempts: number;
  lockDurationMinutes: number;
  // IP Whitelist
  ipWhitelistEnabled: boolean;
  ipWhitelist: { ip: string; description: string; createdAt: string; enabled: boolean }[];
  // IP Blacklist
  ipBlacklist: { ip: string; reason: string; blockedAt: string; enabled: boolean }[];
  // Country Restrictions
  countryRestrictions: Record<string, boolean>;
  blockedCountryMessage: string;
  // Security
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  rememberMeDays: number;
  twoFactorEnabled: boolean;
  emailVerificationRequired: boolean;
  mobileVerificationRequired: boolean;
  // File Upload
  maxUploadSizeMB: number;
  allowedImageTypes: string;
  allowedDocumentTypes: string;
  maxVerificationFileSizeMB: number;
  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  adminNotifications: boolean;
  referralNotifications: boolean;
  investmentNotifications: boolean;
  depositNotifications: boolean;
  withdrawalNotifications: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  websiteName: 'Coltion Product Investment',
  websiteDescription: 'Premium Investment Platform',
  supportEmail: 'support@coltionproduct.com',
  supportPhone: '+63 900 000 0000',
  companyAddress: 'Metro Manila, Philippines',
  footerCopyright: '© 2026 Coltion Product Investment. All rights reserved.',
  websiteLogo: '',
  websiteFavicon: '',
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please try again later.',
  referralCommissionPercent: 30,
  paymentMethods: { GCash: true, Maya: true, QRPH: true },
  withdrawalsEnabled: true,
  withdrawalMaintenanceMessage: 'Withdrawals are temporarily unavailable due to maintenance.',
  registrationEnabled: true,
  loginEnabled: true,
  maxLoginAttempts: 5,
  lockDurationMinutes: 30,
  ipWhitelistEnabled: false,
  ipWhitelist: [],
  ipBlacklist: [],
  countryRestrictions: {},
  blockedCountryMessage: 'Service is unavailable in your country.',
  sessionTimeoutMinutes: 60,
  passwordMinLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  rememberMeDays: 30,
  twoFactorEnabled: false,
  emailVerificationRequired: true,
  mobileVerificationRequired: true,
  maxUploadSizeMB: 10,
  allowedImageTypes: 'jpg,png,svg,webp',
  allowedDocumentTypes: 'pdf,doc,docx',
  maxVerificationFileSizeMB: 5,
  emailNotifications: true,
  smsNotifications: false,
  inAppNotifications: true,
  adminNotifications: true,
  referralNotifications: true,
  investmentNotifications: true,
  depositNotifications: true,
  withdrawalNotifications: true,
};

function getAdminInfo(): { id: string; name: string; role: string } {
  try {
    const data = localStorage.getItem(ADMIN_SESSION_KEY);
    if (data) { const a = JSON.parse(data); return { id: a.id, name: a.name, role: a.role }; }
  } catch {}
  return { id: 'unknown', name: 'Unknown Admin', role: 'unknown' };
}

function addAuditLog(setting: string, oldValue: string, newValue: string): void {
  const admin = getAdminInfo();
  const logs = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  logs.unshift({
    id: 'aud_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    adminId: admin.id, adminName: admin.name, adminRole: admin.role,
    action: `Settings Changed: ${setting}`,
    beforeValue: oldValue, afterValue: newValue,
    timestamp: new Date().toISOString(), ipAddress: '127.0.0.1',
  });
  if (logs.length > 1000) logs.length = 1000;
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
}

function notifyUpdate(): void {
  try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
  try { window.dispatchEvent(new CustomEvent('settings:updated')); } catch {}
}

export const settingsService = {
  getSettings(): PlatformSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const saved = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...saved };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: PlatformSettings): { success: boolean; error?: string } {
    try {
      const old = this.getSettings();
      const changes: { key: string; oldVal: string; newVal: string }[] = [];

      // Detect changes for audit log
      for (const key of Object.keys(settings) as (keyof PlatformSettings)[]) {
        const oldVal = JSON.stringify(old[key]);
        const newVal = JSON.stringify(settings[key]);
        if (oldVal !== newVal) {
          changes.push({ key, oldVal, newVal });
        }
      }

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Audit log for each changed setting
      for (const change of changes) {
        addAuditLog(change.key, change.oldVal, change.newVal);
      }

      notifyUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to save settings.' };
    }
  },

  // Convenience getters for other modules
  isMaintenanceMode(): boolean {
    return this.getSettings().maintenanceMode;
  },

  isRegistrationEnabled(): boolean {
    return this.getSettings().registrationEnabled;
  },

  isLoginEnabled(): boolean {
    return this.getSettings().loginEnabled;
  },

  isWithdrawalsEnabled(): boolean {
    return this.getSettings().withdrawalsEnabled;
  },

  getReferralCommissionPercent(): number {
    return this.getSettings().referralCommissionPercent;
  },

  isPaymentMethodEnabled(method: string): boolean {
    const methods = this.getSettings().paymentMethods;
    return methods[method] !== false;
  },

  isCountryBlocked(countryCode: string): boolean {
    const restrictions = this.getSettings().countryRestrictions;
    return restrictions[countryCode] === false;
  },

  isIpBlacklisted(ip: string): boolean {
    return this.getSettings().ipBlacklist.some(b => b.ip === ip && b.enabled);
  },

  isIpWhitelisted(ip: string): boolean {
    if (!this.getSettings().ipWhitelistEnabled) return true;
    return this.getSettings().ipWhitelist.some(w => w.ip === ip && w.enabled);
  },

  getMaxLoginAttempts(): number {
    return this.getSettings().maxLoginAttempts;
  },

  getLockDurationMinutes(): number {
    return this.getSettings().lockDurationMinutes;
  },
};