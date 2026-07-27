import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { transactionService } from '../services/transactionService';
import { FORMAT_CURRENCY } from '../constants';
import type { Transaction } from '../types';

interface Props {
  onBack: () => void;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'rgba(234,179,8,0.1)', text: colors.warning, border: 'rgba(234,179,8,0.3)' },
  success: { bg: 'rgba(16,185,129,0.1)', text: colors.success, border: 'rgba(16,185,129,0.3)' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: colors.error, border: 'rgba(239,68,68,0.3)' },
};

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  vip_purchase: 'VIP Purchase',
  daily_profit: 'Daily Profit',
  referral_commission: 'Referral Commission',
  wallet_transfer: 'Wallet Transfer',
  vip_maturity_transfer: 'VIP Maturity Transfer',
  welcome_bonus: 'Welcome Bonus',
};

export const TransactionHistorySection: React.FC<Props> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      setTxs(transactionService.getUserTransactions(user.id));
    }
  }, [user]);

  const filtered = filter === 'all' ? txs : txs.filter(t => t.type === filter);

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 800px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <motion.button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
      </motion.button>

      <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: 'clamp(16px, 2.5vh, 24px)' }}>Transaction History</h2>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'clamp(16px, 2vh, 20px)' }}>
        {['all', 'deposit', 'withdrawal', 'vip_purchase', 'daily_profit', 'referral_commission', 'vip_maturity_transfer', 'welcome_bonus'].map(f => (
          <motion.button key={f} onClick={() => setFilter(f)}
            style={{ padding: '4px 12px', background: filter === f ? colors.primary + '20' : colors.bgGlass, border: `1px solid ${filter === f ? colors.primary : colors.borderDefault}`, borderRadius: borderRadius.full, cursor: 'pointer', fontSize: typography.xs, fontWeight: typography.semibold, color: filter === f ? colors.primary : colors.textSecondary, fontFamily: typography.fontFamily }}
            whileHover={{ background: filter === f ? colors.primary + '20' : colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
            {f === 'all' ? 'All' : typeLabels[f] || f}
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(24px, 3vw, 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>No Transactions Yet</h3>
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed, maxWidth: 'clamp(260px, 70vw, 400px)' }}>Your transactions will appear here once you start investing.</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((tx, i) => {
            const sc = statusColors[tx.status] || statusColors.pending;
            const date = new Date(tx.createdAt);
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}
                style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.lg, padding: 'clamp(14px, 2vw, 18px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {tx.type === 'deposit' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                  {tx.type === 'withdrawal' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                  {tx.type === 'vip_purchase' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>}
                  {tx.type === 'daily_profit' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  {tx.type === 'referral_commission' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
                  {tx.type === 'vip_maturity_transfer' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>}
                  {tx.type === 'welcome_bonus' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{typeLabels[tx.type] || tx.type}</p>
                    <span style={{ fontSize: typography.xs, padding: '1px 8px', borderRadius: borderRadius.full, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>{tx.status}</span>
                  </div>
                  <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '2px' }}>
                    {tx.reference} · {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {tx.method && <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{tx.method}</p>}
                </div>
                <p style={{ fontSize: typography.base, fontWeight: typography.bold, color: tx.type === 'deposit' || tx.type === 'daily_profit' || tx.type === 'referral_commission' || tx.type === 'vip_maturity_transfer' || tx.type === 'welcome_bonus' ? colors.success : colors.textPrimary, fontFamily: typography.fontFamily, flexShrink: 0 }}>
                  {tx.type === 'deposit' || tx.type === 'daily_profit' || tx.type === 'referral_commission' || tx.type === 'vip_maturity_transfer' || tx.type === 'welcome_bonus' ? '+' : '-'}{FORMAT_CURRENCY(tx.amount)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
});

TransactionHistorySection.displayName = 'TransactionHistorySection';