/**
 * Settings Enforcer
 * 
 * This is the SINGLE SOURCE OF TRUTH for platform settings enforcement.
 * Every user-facing feature MUST check these functions before executing.
 * 
 * Reads from the SAME `coltion_settings` key as the Admin Panel's settingsService.
 */

const SETTINGS_KEY = 'coltion_settings';
const ADMIN_SESSION_KEY = 'coltion_admin_session';

export interface PlatformSettings {
  websiteName: string;
  websiteDescription: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  footerCopyright: string;
  websiteLogo: string;
  websiteFavicon: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  referralCommissionPercent: number;
  paymentMethods: Record<string, boolean>;
  withdrawalsEnabled: boolean;
  withdrawalMaintenanceMessage: string;
  registrationEnabled: boolean;
  loginEnabled: boolean;
  maxLoginAttempts: number;
  lockDurationMinutes: number;
  ipWhitelistEnabled: boolean;
  ipWhitelist: { ip: string; description: string; createdAt: string; enabled: boolean }[];
  ipBlacklist: { ip: string; reason: string; blockedAt: string; enabled: boolean }[];
  countryRestrictions: Record<string, boolean>;
  blockedCountryMessage: string;
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
}

function getSettings(): PlatformSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return {} as PlatformSettings;
}

export function getSetting<K extends keyof PlatformSettings>(key: K, defaultValue?: PlatformSettings[K]): PlatformSettings[K] {
  const settings = getSettings();
  return (settings[key] !== undefined && settings[key] !== null) ? settings[key] : (defaultValue as PlatformSettings[K]);
}

// ==================== ENFORCEMENT FUNCTIONS ====================

/**
 * Check if maintenance mode is active.
 * If true and user is NOT an admin, return a block message.
 */
export function checkMaintenanceMode(): { blocked: boolean; message: string } {
  const maintenance = getSetting('maintenanceMode', false);
  if (!maintenance) return { blocked: false, message: '' };
  
  // Admin can always bypass
  try {
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (adminSession) return { blocked: false, message: '' };
  } catch {}
  
  return { blocked: true, message: getSetting('maintenanceMessage', 'Website Under Maintenance') };
}

/**
 * Check if registration is enabled.
 */
export function checkRegistrationEnabled(): { blocked: boolean; message: string } {
  const enabled = getSetting('registrationEnabled', true);
  if (enabled) return { blocked: false, message: '' };
  return { blocked: true, message: 'New registrations are temporarily disabled.' };
}

/**
 * Check if login is enabled (admin always allowed).
 */
export function checkLoginEnabled(): { blocked: boolean; message: string } {
  // Admin always allowed
  try {
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (adminSession) return { blocked: false, message: '' };
  } catch {}
  
  const enabled = getSetting('loginEnabled', true);
  if (enabled) return { blocked: false, message: '' };
  return { blocked: true, message: 'Login is temporarily unavailable.' };
}

/**
 * Check if withdrawals are enabled.
 */
export function checkWithdrawalsEnabled(): { blocked: boolean; message: string } {
  const enabled = getSetting('withdrawalsEnabled', true);
  if (enabled) return { blocked: false, message: '' };
  return { blocked: true, message: getSetting('withdrawalMaintenanceMessage', 'Withdrawals are temporarily unavailable.') };
}

/**
 * Check if a payment method is enabled.
 */
export function isPaymentMethodEnabled(method: string): boolean {
  const methods = getSetting('paymentMethods', {} as Record<string, boolean>);
  return methods[method] !== false;
}

/**
 * Get the referral commission percentage.
 */
export function getReferralCommissionPercent(): number {
  return getSetting('referralCommissionPercent', 5);
}

/**
 * Get website info for display.
 */
export function getWebsiteInfo(): { name: string; description: string; logo: string; favicon: string; supportEmail: string; supportPhone: string; address: string; footer: string } {
  return {
    name: getSetting('websiteName', 'Coltion Product Investment'),
    description: getSetting('websiteDescription', 'Premium Investment Platform'),
    logo: getSetting('websiteLogo', ''),
    favicon: getSetting('websiteFavicon', ''),
    supportEmail: getSetting('supportEmail', 'support@coltionproduct.com'),
    supportPhone: getSetting('supportPhone', '+63 900 000 0000'),
    address: getSetting('companyAddress', 'Metro Manila, Philippines'),
    footer: getSetting('footerCopyright', '© 2026 Coltion Product Investment. All rights reserved.'),
  };
}