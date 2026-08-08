/**
 * Moxsys Payout Channels Service
 * Fetches available payout channels from Moxsys.
 * Endpoint: GET https://platform.moxsys.io/api/v1/{mode}/payout-channels
 * Auth: Bearer {MOXSYS_API_KEY}
 */

export interface PayoutChannel {
  id: string;
  type: string;
  bank_code: string;
  name: string;
  minimum_amount: number;
  maximum_amount: number;
}

export async function getMoxsysPayoutChannels(): Promise<PayoutChannel[]> {
  const moxsysApiKey = process.env.MOXSYS_API_KEY;
  const moxsysMode = process.env.MOXSYS_MODE || 'live';

  if (!moxsysApiKey) {
    console.error('[Moxsys Channels] Missing MOXSYS_API_KEY.');
    return [];
  }

  const url = `https://platform.moxsys.io/api/v1/${moxsysMode}/payout-channels`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + moxsysApiKey,
      },
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      console.error(`[Moxsys Channels] HTTP ${res.status}: ${text.substring(0, 500)}`);
      return [];
    }

    const channels = data?.data || data?.channels || [];
    if (!Array.isArray(channels)) return [];

    // Only return supported types
    const supported = ['instapay', 'swiftpay', 'pesonet', 'crypto'];
    return channels.filter((c: any) => supported.includes(c?.type));
  } catch (e: any) {
    console.error('[Moxsys Channels] Network/API error:', e?.message || e);
    return [];
  }
}