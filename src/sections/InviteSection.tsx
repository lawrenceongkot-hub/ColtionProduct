import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getReferralStatsAPI } from '../services/referralService';
import { agentService } from '../services/agentService';
import { settingsEnforcer } from '../services/settingsEnforcer';
import { useResponsive } from '../hooks/useResponsive';
import { getReferralLink } from '../utils/domain';
import { FORMAT_CURRENCY } from '../constants';
import type { ReferralStats, AgentReferral, AgentCommission, AgentProfile } from '../types';

export const InviteSection: React.FC = React.memo(() => {
  const { user } = useAuth();
  const responsive = useResponsive();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [agentReferrals, setAgentReferrals] = useState<AgentReferral[]>([]);
  const [agentCommissions, setAgentCommissions] = useState<AgentCommission[]>([]);
  const [commissionRate, setCommissionRate] = useState(30);
  const [stats, setStats] = useState<ReferralStats>({
    referralCount: 0,
    totalEarnings: 0,
    recentReferrals: [],
  });
  const [loading, setLoading] = useState(true);

  // Generate invitation link dynamically from the code (never use stored URL which may have old domain)
  const invitationCode = user?.invitationCode || '';
  const invitationLink = invitationCode ? getReferralLink(invitationCode) : '';

  const loadAllData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [s, p, r, c, settings] = await Promise.all([
        getReferralStatsAPI(user.invitationCode),
        agentService.getOrCreateAgent(),
        agentService.getReferrals(),
        agentService.getCommissions(),
        settingsEnforcer.getSettings(),
      ]);
      setStats(s);
      setAgentProfile(p);
      setAgentReferrals(r);
      setAgentCommissions(c);
      if (settings?.referralCommissionPercent) {
        setCommissionRate(settings.referralCommissionPercent);
      }
    } catch {
      // Keep existing data on error
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  const copyToClipboard = useCallback(async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  }, []);

  const handleShare = useCallback(async () => {
    const shareText = `Join Coltion Product using my invitation link and start your investment journey today.\n\n${invitationLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Coltion Product',
          text: shareText,
          url: invitationLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      await copyToClipboard(invitationLink, 'link');
    }
  }, [invitationLink, copyToClipboard]);

  if (!user) return null;

  // Statistics come from backend /api/referrals (single source of truth)
  const totalInvited = stats.totalReferrals ?? stats.referralCount ?? 0;
  const activeReferrals = stats.activeReferrals ?? 0;
  const depositedReferrals = stats.depositedReferrals ?? 0;
  const totalDeposits = stats.totalDepositAmount ?? 0;
  const totalEarned = stats.totalCommissionEarned ?? 0;
  const pendingCommission = stats.pendingCommission ?? 0;

  return (
    <div
      style={{
        maxWidth: 'clamp(320px, 90vw, 800px)',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px)',
        paddingBottom: 'clamp(40px, 5vh, 60px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(20px, 3vh, 32px)',
      }}
    >
      {/* Header */}
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(4px, 0.8vh, 8px)',
          textAlign: 'center',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 style={{
          fontSize: typography.xl,
          fontWeight: typography.bold,
          color: colors.textPrimary,
          fontFamily: typography.fontFamily,
        }}>
          Invite & Earn
        </h2>
        <p style={{
          fontSize: typography.sm,
          color: colors.textTertiary,
          fontFamily: typography.fontFamily,
          maxWidth: 'clamp(280px, 70vw, 400px)',
        }}>
          Share your invitation link and earn {commissionRate}% commission when your friends join.
        </p>
      </motion.div>

      {loading ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(32px, 4vw, 48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <motion.div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${colors.bgGlassLight}`, borderTopColor: colors.primary }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Loading referral dashboard...</p>
        </motion.div>
      ) : (
        <>
          {/* Invitation Link & Code Card */}
          <motion.div
            style={{
              width: '100%',
              background: colors.gradientGlass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div
              style={{
                padding: 'clamp(16px, 2.5vw, 24px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(16px, 2.5vh, 24px)',
              }}
            >
              <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Your Invitation</h3>

              {/* Link Section */}
              <div>
                <p style={{
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily,
                  marginBottom: 'clamp(6px, 1vh, 10px)',
                }}>
                  Invitation Link
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(8px, 1.2vw, 12px)',
                    padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)',
                    background: colors.bgGlassLight,
                    border: `1px solid ${colors.borderDefault}`,
                    borderRadius: borderRadius.md,
                    overflow: 'hidden',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span
                    style={{
                      flex: 1,
                      fontSize: typography.sm,
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamilyMono,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {invitationLink}
                  </span>
                  <motion.button
                    onClick={() => copyToClipboard(invitationLink, 'link')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: 'clamp(4px, 0.6vh, 6px) clamp(8px, 1vw, 12px)',
                      background: copiedLink ? 'rgba(16, 185, 129, 0.15)' : colors.bgGlass,
                      border: `1px solid ${copiedLink ? 'rgba(16, 185, 129, 0.3)' : colors.borderDefault}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: typography.xs,
                      fontWeight: typography.semibold,
                      color: copiedLink ? colors.success : colors.primary,
                      fontFamily: typography.fontFamily,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                    whileHover={{ background: colors.bgGlassLight }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {copiedLink ? '✓ Copied' : 'Copy Link'}
                  </motion.button>
                </div>
              </div>

              {/* Code Section */}
              <div>
                <p style={{
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily,
                  marginBottom: 'clamp(6px, 1vh, 10px)',
                }}>
                  Invitation Code
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(8px, 1.2vw, 12px)',
                    padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)',
                    background: colors.bgGlassLight,
                    border: `1px solid ${colors.borderDefault}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <div
                    style={{
                      width: 'clamp(36px, 4vw, 44px)',
                      height: 'clamp(36px, 4vw, 44px)',
                      borderRadius: borderRadius.sm,
                      background: colors.gradientBlue,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: typography.lg,
                      fontWeight: typography.bold,
                      color: colors.textPrimary,
                      fontFamily: typography.fontFamilyMono,
                      letterSpacing: '0.1em',
                    }}
                  >
                    {invitationCode}
                  </span>
                  <motion.button
                    onClick={() => copyToClipboard(invitationCode, 'code')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: 'clamp(4px, 0.6vh, 6px) clamp(8px, 1vw, 12px)',
                      background: copiedCode ? 'rgba(16, 185, 129, 0.15)' : colors.bgGlass,
                      border: `1px solid ${copiedCode ? 'rgba(16, 185, 129, 0.3)' : colors.borderDefault}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: typography.xs,
                      fontWeight: typography.semibold,
                      color: copiedCode ? colors.success : colors.primary,
                      fontFamily: typography.fontFamily,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                    whileHover={{ background: colors.bgGlassLight }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {copiedCode ? '✓ Copied' : 'Copy Code'}
                  </motion.button>
                </div>
              </div>

              {/* Native Share Button */}
              <motion.button
                onClick={handleShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: 'clamp(12px, 1.8vh, 16px)',
                  background: colors.gradientBlue,
                  border: 'none',
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: typography.base,
                  fontWeight: typography.semibold,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily,
                  boxShadow: shadows.glow,
                }}
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Invitation
              </motion.button>
            </div>
          </motion.div>

          {/* Referral Statistics */}
          <motion.div
            style={{
              width: '100%',
              background: colors.gradientGlass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.xl,
              padding: 'clamp(16px, 2.5vw, 24px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(12px, 1.5vh, 16px)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Referral Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 'clamp(8px, 1.2vw, 12px)' }}>
              <StatCard label="Total Invited Users" value={totalInvited.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} delay={0} />
              <StatCard label="Active Referrals" value={activeReferrals.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} delay={0.05} />
              <StatCard label="Successful Deposits" value={depositedReferrals.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} delay={0.1} />
              <StatCard label="Total Referral Deposits" value={FORMAT_CURRENCY(totalDeposits)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>} delay={0.15} />
              <StatCard label="Pending Commission" value={FORMAT_CURRENCY(pendingCommission)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} delay={0.2} />
              <StatCard label="Total Commission Earned" value={FORMAT_CURRENCY(totalEarned)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>} delay={0.25} />
            </div>
          </motion.div>

          {/* Referral History Table */}
          <motion.div
            style={{
              width: '100%',
              background: colors.gradientGlass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', borderBottom: `1px solid ${colors.borderDefault}` }}>
              <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Referral History</h3>
            </div>
            {agentReferrals.length === 0 ? (
              <div style={{ padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center' }}>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>No referrals yet. Share your invitation code to start earning.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.sm, minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: colors.bgGlassMedium }}>
                      <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'left', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'left', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invited User</th>
                      <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deposit Amount</th>
                      <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commission ({commissionRate}%)</th>
                      <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'center', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentReferrals.map((r, i) => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${colors.borderDefault}`, background: i % 2 === 0 ? 'transparent' : colors.bgGlass }}>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textSecondary, fontFamily: typography.fontFamily, whiteSpace: 'nowrap' }}>{new Date(r.registeredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textPrimary, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>{r.fullName}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textPrimary, fontFamily: typography.fontFamily }}>{r.totalApprovedDeposits && r.totalApprovedDeposits > 0 ? FORMAT_CURRENCY(r.totalApprovedDeposits) : '—'}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: r.commission ? colors.success : colors.textTertiary, fontFamily: typography.fontFamily, fontWeight: r.commission ? typography.semibold : typography.regular }}>{r.commission ? FORMAT_CURRENCY(r.commission) : '—'}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'center' }}>
                          <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, padding: '2px 10px', borderRadius: borderRadius.full, background: r.displayStatus === 'qualified' ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${r.displayStatus === 'qualified' ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)'}`, color: r.displayStatus === 'qualified' ? colors.success : colors.warning, fontFamily: typography.fontFamily }}>
                            {r.displayStatus === 'qualified' ? 'Qualified' : 'Waiting Deposit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Commission History */}
          {agentCommissions.length > 0 && (
            <motion.div
              style={{
                width: '100%',
                background: colors.gradientGlass,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', borderBottom: `1px solid ${colors.borderDefault}` }}>
                <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Commission History</h3>
              </div>
              <div style={{ padding: 'clamp(12px, 1.5vw, 16px)' }}>
                {agentCommissions.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 1.2vh, 14px) 0', borderBottom: i < agentCommissions.length - 1 ? `1px solid ${colors.borderDefault}` : 'none' }}>
                    <div>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{c.referredName}</p>
                      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Deposit: {FORMAT_CURRENCY(c.depositAmount)} · {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.bold, color: colors.success, fontFamily: typography.fontFamily }}>+{FORMAT_CURRENCY(c.commissionAmount)}</p>
                      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{c.commissionRate * 100}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </>
      )}
    </div>
  );
});

InviteSection.displayName = 'InviteSection';

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; delay: number }> = React.memo(({ label, value, icon, delay }) => (
  <motion.div
    style={{
      background: colors.gradientGlass,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${colors.borderDefault}`,
      borderRadius: borderRadius.lg,
      padding: 'clamp(14px, 2vw, 20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(8px, 1.2vh, 12px)',
    }}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <div
      style={{
        width: 'clamp(36px, 4vw, 40px)',
        height: 'clamp(36px, 4vw, 40px)',
        borderRadius: borderRadius.sm,
        background: colors.bgGlassMedium,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
    <div>
      <p style={{ fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
        {value}
      </p>
      <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '2px' }}>
        {label}
      </p>
    </div>
  </motion.div>
));