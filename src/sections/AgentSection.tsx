import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { agentService } from '../services/agentService';
import { FORMAT_CURRENCY } from '../constants';
import type { AgentProfile, AgentReferral, AgentCommission } from '../types';

interface AgentSectionProps {
  onBack: () => void;
}

export const AgentSection: React.FC<AgentSectionProps> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const responsive = useResponsive();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [referrals, setReferrals] = useState<AgentReferral[]>([]);
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [tab, setTab] = useState<'overview' | 'referrals' | 'commissions'>('overview');

  const copyToClipboard = useCallback(async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      if (type === 'code') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    const shareText = `Join Coltion Product using my agent invitation link and start earning today!\n\n${profile.agentLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join Coltion Product', text: shareText, url: profile.agentLink }); } catch {}
    } else {
      await copyToClipboard(profile.agentLink, 'link');
    }
  }, [profile, copyToClipboard]);

  if (!user || !profile) return null;

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 800px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <motion.button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 'clamp(48px, 6vw, 56px)', height: 'clamp(48px, 6vw, 56px)', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div>
            <h2 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Agent Invitation</h2>
            <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: '2px' }}>Invite friends and earn 30% commission on their first deposit.</p>
          </div>
        </div>

        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(16px, 2.5vw, 24px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
          <div>
            <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '6px' }}>Invitation Code</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
              <div style={{ width: '36px', height: '36px', borderRadius: borderRadius.sm, background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <span style={{ flex: 1, fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamilyMono, letterSpacing: '0.1em' }}>{profile.agentCode}</span>
              <motion.button onClick={() => copyToClipboard(profile.agentCode, 'code')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: copiedCode ? 'rgba(16,185,129,0.15)' : colors.bgGlass, border: `1px solid ${copiedCode ? 'rgba(16,185,129,0.3)' : colors.borderDefault}`, borderRadius: borderRadius.sm, cursor: 'pointer', fontSize: typography.xs, fontWeight: typography.semibold, color: copiedCode ? colors.success : colors.primary, fontFamily: typography.fontFamily, flexShrink: 0 }}
                whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
                {copiedCode ? 'Copied' : 'Copy'}
              </motion.button>
            </div>
          </div>
          <div>
            <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '6px' }}>Invitation Link</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
              <span style={{ flex: 1, fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamilyMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.agentLink}</span>
              <motion.button onClick={() => copyToClipboard(profile.agentLink, 'link')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: copiedLink ? 'rgba(16,185,129,0.15)' : colors.bgGlass, border: `1px solid ${copiedLink ? 'rgba(16,185,129,0.3)' : colors.borderDefault}`, borderRadius: borderRadius.sm, cursor: 'pointer', fontSize: typography.xs, fontWeight: typography.semibold, color: copiedLink ? colors.success : colors.primary, fontFamily: typography.fontFamily, flexShrink: 0 }}
                whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
                {copiedLink ? 'Copied' : 'Copy'}
              </motion.button>
            </div>
          </div>
          <motion.button onClick={handleShare}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px)', background: colors.gradientBlue, border: 'none', borderRadius: borderRadius.md, cursor: 'pointer', fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily, boxShadow: shadows.glow }}
            whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            Share Invitation
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 'clamp(8px, 1.2vw, 12px)' }}>
          <StatCard label="Total Referrals" value={profile.totalReferrals.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} delay={0} />
          <StatCard label="Qualified Deposits" value={profile.qualifiedDeposits.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} delay={0.05} />
          <StatCard label="Total Commission" value={FORMAT_CURRENCY(profile.totalCommission)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>} delay={0.1} />
          <StatCard label="Available Balance" value={FORMAT_CURRENCY(profile.availableBalance)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>} delay={0.15} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['overview', 'referrals', 'commissions'] as const).map(t => (
            <motion.button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 16px', background: tab === t ? colors.primary + '20' : colors.bgGlass, border: `1px solid ${tab === t ? colors.primary : colors.borderDefault}`, borderRadius: borderRadius.full, cursor: 'pointer', fontSize: typography.sm, fontWeight: tab === t ? typography.semibold : typography.medium, color: tab === t ? colors.primary : colors.textSecondary, fontFamily: typography.fontFamily }}
              whileHover={{ background: tab === t ? colors.primary + '20' : colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
              {t === 'overview' ? 'Overview' : t === 'referrals' ? `Referrals (${referrals.length})` : `Commissions (${commissions.length})`}
            </motion.button>
          ))}
        </div>

        {tab === 'referrals' && (
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
            {referrals.length === 0 ? (
              <div style={{ padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center' }}>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>No referrals yet. Share your invitation code to start earning.</p>
              </div>
            ) : (
              <div style={{ padding: 'clamp(12px, 1.5vw, 16px)' }}>
                {referrals.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 1.2vh, 14px) 0', borderBottom: i < referrals.length - 1 ? `1px solid ${colors.borderDefault}` : 'none' }}>
                    <div>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{r.fullName}</p>
                      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{new Date(r.registeredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, padding: '2px 10px', borderRadius: borderRadius.full, background: r.status === 'commission_paid' ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${r.status === 'commission_paid' ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)'}`, color: r.status === 'commission_paid' ? colors.success : colors.warning, fontFamily: typography.fontFamily }}>
                      {r.status === 'commission_paid' ? `₱${r.commission}` : 'Waiting Deposit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'commissions' && (
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
            {commissions.length === 0 ? (
              <div style={{ padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center' }}>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>No commissions yet.</p>
              </div>
            ) : (
              <div style={{ padding: 'clamp(12px, 1.5vw, 16px)' }}>
                {commissions.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 1.2vh, 14px) 0', borderBottom: i < commissions.length - 1 ? `1px solid ${colors.borderDefault}` : 'none' }}>
                    <div>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{c.referredName}</p>
                      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Deposit: {FORMAT_CURRENCY(c.depositAmount)} · {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.bold, color: colors.success, fontFamily: typography.fontFamily }}>+{FORMAT_CURRENCY(c.commissionAmount)}</p>
                      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>30%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'overview' && (
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>How It Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Share your unique invitation code or link with friends.',
                'When they register using your code, they become your referral.',
                'When your referred user makes their first successful deposit, you earn 30% commission.',
                'Commission is credited to your Main Wallet immediately.',
                'Only the first deposit qualifies — future deposits do not earn commission.',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.xs, fontWeight: typography.bold, color: colors.textPrimary, flexShrink: 0 }}>{i + 1}</div>
                  <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
});

AgentSection.displayName = 'AgentSection';

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; delay: number }> = React.memo(({ label, value, icon, delay }) => (
  <motion.div style={{ background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.lg, padding: 'clamp(12px, 1.5vw, 16px)', display: 'flex', flexDirection: 'column', gap: '6px' }}
    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
    <div style={{ width: '32px', height: '32px', borderRadius: borderRadius.sm, background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <p style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{value}</p>
    <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{label}</p>
  </motion.div>
));

StatCard.displayName = 'StatCard';