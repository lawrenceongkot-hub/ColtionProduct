import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { agentService } from '../services/agentService';
import { settingsEnforcer } from '../services/settingsEnforcer';
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
  const [commissionRate, setCommissionRate] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadAgentData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, r, c, settings] = await Promise.all([
        agentService.getOrCreateAgent(),
        agentService.getReferrals(),
        agentService.getCommissions(),
        settingsEnforcer.getSettings(),
      ]);
      setProfile(p);
      setReferrals(r);
      setCommissions(c);
      if (settings?.referralCommissionPercent) {
        setCommissionRate(settings.referralCommissionPercent);
      }
    } catch {
      setError('Failed to load agent information. Please try again.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

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

  const shareVia = useCallback((url: string, platform: 'facebook' | 'messenger' | 'telegram' | 'whatsapp') => {
    if (!profile) return;
    const encoded = encodeURIComponent(profile.agentLink);
    const text = encodeURIComponent(`Join Coltion Product using my agent invitation link and start earning today!`);
    let shareUrl = '';
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`; break;
      case 'messenger': shareUrl = `https://www.facebook.com/dialog/send?link=${encoded}&app_id=291494419107518&redirect_uri=${encoded}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${encoded}&text=${text}`; break;
      case 'whatsapp': shareUrl = `https://wa.me/?text=${text}%20${encoded}`; break;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }, [profile]);

  if (!user) return null;

  // Derive statistics from real backend data
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'commission_paid').length;
  const totalDeposits = referrals.reduce((sum, r) => sum + (r.firstDeposit || 0), 0);
  const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const pendingCommission = referrals
    .filter(r => r.status === 'waiting_deposit' && r.firstDeposit)
    .reduce((sum, r) => sum + ((r.firstDeposit || 0) * commissionRate / 100), 0);
  const paidCommission = totalEarned;

  // Example calculation table using real backend commission rate
  const exampleDeposits = [100, 500, 1000, 5000, 10000];

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 800px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <motion.button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
      </motion.button>

      {loading ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(32px, 4vw, 48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <motion.div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${colors.bgGlassLight}`, borderTopColor: colors.primary }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Loading agent information...</p>
        </motion.div>
      ) : error ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(24px, 3vw, 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Failed to Load Agent Information</h3>
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed, maxWidth: 'clamp(260px, 70vw, 400px)' }}>{error}</p>
          <motion.button onClick={loadAgentData} whileTap={{ scale: 0.95 }} style={{ padding: '10px 24px', background: colors.gradientBlue, border: 'none', borderRadius: borderRadius.md, color: colors.textPrimary, fontSize: typography.sm, fontWeight: typography.semibold, fontFamily: typography.fontFamily, cursor: 'pointer' }}>Retry</motion.button>
        </motion.div>
      ) : !profile ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(24px, 3vw, 32px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>No Agent Profile Found</h3>
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed, maxWidth: 'clamp(260px, 70vw, 400px)' }}>Your agent profile could not be created. Please try again.</p>
          <motion.button onClick={loadAgentData} whileTap={{ scale: 0.95 }} style={{ padding: '10px 24px', background: colors.gradientBlue, border: 'none', borderRadius: borderRadius.md, color: colors.textPrimary, fontSize: typography.sm, fontWeight: typography.semibold, fontFamily: typography.fontFamily, cursor: 'pointer' }}>Retry</motion.button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 'clamp(48px, 6vw, 56px)', height: 'clamp(48px, 6vw, 56px)', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <h2 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Agent Invitation</h2>
              <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: '2px' }}>Invite friends and earn {commissionRate}% commission on their first deposit.</p>
            </div>
          </div>

          {/* SECTION 4: Share Invitation */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(16px, 2.5vw, 24px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Share Your Invitation</h3>
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
                  {copiedCode ? 'Copied' : 'Copy Code'}
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
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </motion.button>
              </div>
            </div>
            {/* Social share buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px' }}>
              <SocialShareButton label="Facebook" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>} onClick={() => shareVia(profile.agentLink, 'facebook')} />
              <SocialShareButton label="Messenger" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#0084FF"><path d="M12 0C5.373 0 0 5.373 0 12c0 3.623 1.57 6.888 4.072 9.14V24l3.846-1.898A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm1.062 16.156L10.53 13.47l-4.97 2.97 6.41-6.82 2.81 2.5 4.56-2.97-6.278 7.006z"/></svg>} onClick={() => shareVia(profile.agentLink, 'messenger')} />
              <SocialShareButton label="Telegram" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>} onClick={() => shareVia(profile.agentLink, 'telegram')} />
              <SocialShareButton label="WhatsApp" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>} onClick={() => shareVia(profile.agentLink, 'whatsapp')} />
            </div>
            <motion.button onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px)', background: colors.gradientBlue, border: 'none', borderRadius: borderRadius.md, cursor: 'pointer', fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily, boxShadow: shadows.glow }}
              whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              Share via Native Share
            </motion.button>
          </div>

          {/* SECTION 5: Referral Statistics */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(16px, 2.5vw, 24px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vh, 16px)' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Referral Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 'clamp(8px, 1.2vw, 12px)' }}>
              <StatCard label="Total Invited Users" value={totalReferrals.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} delay={0} />
              <StatCard label="Active Referrals" value={activeReferrals.toString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} delay={0.05} />
              <StatCard label="Total Referral Deposits" value={FORMAT_CURRENCY(totalDeposits)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} delay={0.1} />
              <StatCard label="Total Commission Earned" value={FORMAT_CURRENCY(totalEarned)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>} delay={0.15} />
              <StatCard label="Pending Commission" value={FORMAT_CURRENCY(pendingCommission)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} delay={0.2} />
              <StatCard label="Paid Commission" value={FORMAT_CURRENCY(paidCommission)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>} delay={0.25} />
            </div>
          </div>

          {/* SECTION 1: How It Works */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>How the Agent Invitation Program Works</h3>
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, text: 'Share your unique invitation link or invitation code with friends.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, text: 'Your friend registers using your invitation code or link.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, text: 'The referred user makes their first successful deposit.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>, text: `You automatically receive a ${commissionRate}% referral commission based on that deposit.` },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>, text: 'The commission is credited directly to your Main Wallet immediately.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>, text: 'You can withdraw or use your commission to purchase VIP plans.' },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: borderRadius.md, background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary, flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1, paddingTop: '4px' }}>
                  <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{step.text}</p>
                </div>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.xs, fontWeight: typography.bold, color: colors.primary, flexShrink: 0 }}>{i + 1}</div>
              </motion.div>
            ))}
          </div>

          {/* SECTION 2: Referral Benefits */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Referral Benefits</h3>
            {[
              `Earn ${commissionRate}% commission on every successful deposit made by your referred users.`,
              'No limit on the number of users you can invite.',
              'Commission is calculated based on the actual deposit amount.',
              'Referral commissions are credited automatically after the deposit is approved.',
              'Track all your invited users and commission history in your dashboard.',
            ].map((benefit, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: typography.base, color: colors.success, flexShrink: 0, lineHeight: 1.4 }}>✔</span>
                <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{benefit}</p>
              </motion.div>
            ))}
          </div>

          {/* SECTION 3: Example Calculation */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Example Calculation</h3>
            <div style={{ overflow: 'hidden', borderRadius: borderRadius.md, border: `1px solid ${colors.borderDefault}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.sm }}>
                <thead>
                  <tr style={{ background: colors.bgGlassMedium }}>
                    <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'left', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friend Deposit</th>
                    <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Commission ({commissionRate}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {exampleDeposits.map((dep, i) => (
                    <tr key={dep} style={{ borderTop: `1px solid ${colors.borderDefault}`, background: i % 2 === 0 ? 'transparent' : colors.bgGlass }}>
                      <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textPrimary, fontFamily: typography.fontFamily }}>{FORMAT_CURRENCY(dep)}</td>
                      <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.success, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>{FORMAT_CURRENCY(dep * commissionRate / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Commission is calculated as {commissionRate}% of each successful approved deposit.</p>
          </div>

          {/* SECTION 6: Referral History */}
          <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
            <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', borderBottom: `1px solid ${colors.borderDefault}` }}>
              <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Referral History</h3>
            </div>
            {referrals.length === 0 ? (
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
                    {referrals.map((r, i) => (
                      <tr key={r.id} style={{ borderTop: `1px solid ${colors.borderDefault}`, background: i % 2 === 0 ? 'transparent' : colors.bgGlass }}>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textSecondary, fontFamily: typography.fontFamily, whiteSpace: 'nowrap' }}>{new Date(r.registeredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textPrimary, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>{r.fullName}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textPrimary, fontFamily: typography.fontFamily }}>{r.firstDeposit ? FORMAT_CURRENCY(r.firstDeposit) : '—'}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: r.commission ? colors.success : colors.textTertiary, fontFamily: typography.fontFamily, fontWeight: r.commission ? typography.semibold : typography.regular }}>{r.commission ? FORMAT_CURRENCY(r.commission) : '—'}</td>
                        <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'center' }}>
                          <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, padding: '2px 10px', borderRadius: borderRadius.full, background: r.status === 'commission_paid' ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${r.status === 'commission_paid' ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)'}`, color: r.status === 'commission_paid' ? colors.success : colors.warning, fontFamily: typography.fontFamily }}>
                            {r.status === 'commission_paid' ? 'Paid' : 'Waiting Deposit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Commission history */}
          {commissions.length > 0 && (
            <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
              <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', borderBottom: `1px solid ${colors.borderDefault}` }}>
                <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Commission History</h3>
              </div>
              <div style={{ padding: 'clamp(12px, 1.5vw, 16px)' }}>
                {commissions.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(10px, 1.2vh, 14px) 0', borderBottom: i < commissions.length - 1 ? `1px solid ${colors.borderDefault}` : 'none' }}>
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
            </div>
          )}
        </motion.div>
      )}
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

const SocialShareButton: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = React.memo(({ label, icon, onClick }) => (
  <motion.button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md, cursor: 'pointer', fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}
    whileHover={{ background: colors.bgGlass }} whileTap={{ scale: 0.95 }}>
    {icon}
    <span>{label}</span>
  </motion.button>
));

SocialShareButton.displayName = 'SocialShareButton';