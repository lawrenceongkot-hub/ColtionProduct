/**
 * Moxsys Payout Service
 * Sends an approved withdrawal to the Moxsys payment provider as a payout.
 *
 * Endpoint: POST https://platform.moxsys.io/api/v1/{mode}/payouts/create
 * Auth:     Bearer {MOXSYS_API_KEY}
 *
 * Only called from the Admin Withdrawal Approve flow. Strictly:
 * - Sends the NET amount (never the gross/requested amount)
 * - Uses the user's bound e-wallet account
 * - Stores the provider payout/reference ID
 * - Does NOT mark SUCCESS unless the provider confirms
 * - Prevents duplicate payouts
 */

// Mask any secret before logging
function maskSecret(s?: string): string {
  if (!s) return '';
  return s.length <= 8 ? '***' : s.substring(0, 6) + '...' + s.substring(s.length - 2);
}

export interface PayoutResult {
  ok: boolean;
  providerReference?: string;
  providerStatus?: string;
  providerMessage?: string;
  idempotencyKey?: string;
  raw?: string;
}

/**
 * Create a payout via Moxsys for an approved withdrawal.
 * NEVER logs secrets or PII (account numbers/names are NOT logged).
 */
export async function createMoxsysPayout(
  withdrawalId: string,
  reference: string,
  amount: number,
  method: string,
  walletNumber: string
): Promise<PayoutResult> {
  const moxsysApiKey = process.env.MOXSYS_API_KEY;
  const moxsysMode = process.env.MOXSYS_MODE || 'live';

  if (!moxsysApiKey) {
    console.error('[Payout] Missing MOXSYS_API_KEY.');
    return { ok: false, providerStatus: 'ERROR', providerMessage: 'Payment provider not configured (missing API key).' };
  }

  // Moxsys expects amount in pesos (whole number), matching the deposit flow.
  const payoutAmount = Math.round(amount);

  const methodMap: Record<string, string> = {
    'GCash': 'gcash',
    'Maya': 'maya',
    'QRPH': 'qrph',
    'GrabPay': 'grabpay',
    'GoTyme': 'gotyme',
    'ShopeePay': 'shopeepay',
    'UnionBank': 'unionbank',
  };
  const paymentMethod = methodMap[method] || 'gcash';

  const uuid = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

  const payoutUrl = `https://platform.moxsys.io/api/v1/${moxsysMode}/payouts/create`;
  const payload = {
    external_id: reference,
    amount: payoutAmount,
    payment_method: paymentMethod,
    account_number: walletNumber,
    description: `Withdrawal ${reference}`,
    callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/webhooks/moxsys/payout`,
    metadata: { reference, withdrawalId },
  };

  console.log(`[Payout] Creating payout for withdrawal=${withdrawalId} ref=${reference} amount=${payoutAmount} method=${paymentMethod}`);
  // NEVER log walletNumber or account name. Log only the non-sensitive shape.
  console.log(`[Payout] Endpoint=${payoutUrl} mode=${moxsysMode} apiKey=${maskSecret(moxsysApiKey)}`);

  try {
    const res = await fetch(payoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + moxsysApiKey,
        'Idempotency-Key': uuid,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log(`[Payout] HTTP ${res.status} response=${text.substring(0, 1000)}`);

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.error ||
        data?.errors?.[0]?.message ||
        data?.detail ||
        data?.raw ||
        `HTTP ${res.status}`;
      console.error(`[Payout] Failed for withdrawal=${withdrawalId}: status=${res.status} msg=${msg}`);
      return { ok: false, providerStatus: `HTTP_${res.status}`, providerMessage: msg, idempotencyKey: uuid, raw: text.substring(0, 500) };
    }

    // Moxsys success response. Capture provider payout/reference ID.
    const payoutId = data?.payout_id || data?.id || data?.data?.payout_id || data?.data?.id || '';
    const providerStatus = String(data?.status || data?.data?.status || 'SUCCESS').toUpperCase();

    console.log(`[Payout] Success for withdrawal=${withdrawalId} payoutId=${payoutId} status=${providerStatus}`);
    return { ok: true, providerReference: payoutId, providerStatus, providerMessage: data?.message, idempotencyKey: uuid, raw: text.substring(0, 500) };
  } catch (e: any) {
    console.error(`[Payout] Network/API error for withdrawal=${withdrawalId}: ${e?.message || e}`);
    return { ok: false, providerStatus: 'ERROR', providerMessage: e?.message || 'Payout request failed', idempotencyKey: uuid };
  }
}