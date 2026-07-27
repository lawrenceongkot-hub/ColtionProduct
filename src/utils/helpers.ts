/**
 * Mask a wallet number for security.
 * Shows only first 2 and last 2 digits.
 * Example: 09171234567 → 09*******67
 */
export function maskWalletNumber(number: string): string {
  if (!number || number.length < 4) return number;
  const first = number.slice(0, 2);
  const last = number.slice(-2);
  const masked = '*'.repeat(number.length - 4);
  return `${first}${masked}${last}`;
}