/**
 * Domain utility - generates URLs dynamically using the current origin.
 * Never hardcode domains. This ensures referral links work in both
 * development (localhost) and production (Vercel).
 */

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://coltionproduct.vercel.app';
}

export function getReferralLink(code: string): string {
  return `${getBaseUrl()}/register?ref=${code}`;
}

export function getSupportEmail(): string {
  return 'support@coltionproduct.com';
}