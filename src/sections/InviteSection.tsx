import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getReferralStats } from '../services/referralService';
import { useResponsive } from '../hooks/useResponsive';
import type { ReferralStats } from '../types';

export const InviteSection: React.FC = React.memo(() => {
  const { user } = useAuth();
  const responsive = useResponsive();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    referralCount: 0,
    totalEarnings: 0,
    recentReferrals: [],
  });

  useEffect(() => {
    if (user) {
      const referralStats = getReferralStats(user.id, user.invitationCode);
      setStats(referralStats);
    }
  }, [user]);

  const invitationLink = user?.invitationLink || '';
  const invitationCode = user?.invitationCode || '';

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
          Share your invitation link and earn commissions when your friends join.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 'clamp(10px, 1.5vw, 16px)',
        }}
      >
        <StatCard
          label="Invite Friends"
          value={stats.referralCount.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          delay={0}
        />
        <StatCard
          label="Referral Earnings"
          value={`₱${stats.totalEarnings}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          delay={0.05}
        />
        <StatCard
          label="Successful Referrals"
          value={stats.referralCount.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
          delay={0.1}
        />
      </div>

      {/* Invitation Link Card */}
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
                {copiedLink ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
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
                {copiedCode ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Share Button */}
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

      {/* Recent Referrals */}
      {stats.recentReferrals.length > 0 && (
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
          <div
            style={{
              padding: 'clamp(16px, 2.5vw, 24px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(12px, 1.5vh, 16px)',
            }}
          >
            <h3 style={{
              fontSize: typography.md,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
            }}>
              Recent Referrals
            </h3>
            {stats.recentReferrals.map((ref, i) => (
              <div
                key={ref.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'clamp(8px, 1.2vh, 12px) 0',
                  borderBottom: i < stats.recentReferrals.length - 1 ? `1px solid ${colors.borderDefault}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: 'clamp(32px, 3.5vw, 36px)',
                      height: 'clamp(32px, 3.5vw, 36px)',
                      borderRadius: '50%',
                      background: colors.gradientBlue,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.xs,
                      fontWeight: typography.bold,
                      color: colors.textPrimary,
                    }}
                  >
                    {ref.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p style={{
                      fontSize: typography.base,
                      fontWeight: typography.medium,
                      color: colors.textPrimary,
                      fontFamily: typography.fontFamily,
                    }}>
                      {ref.fullName}
                    </p>
                    <p style={{
                      fontSize: typography.xs,
                      color: colors.textTertiary,
                      fontFamily: typography.fontFamily,
                    }}>
                      {new Date(ref.joinedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: typography.xs,
                    fontWeight: typography.semibold,
                    color: colors.success,
                    fontFamily: typography.fontFamily,
                  }}
                >
                  Active
                </span>
              </div>
            ))}
          </div>
        </motion.div>
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
      <p style={{
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
      }}>
        {value}
      </p>
      <p style={{
        fontSize: typography.xs,
        color: colors.textTertiary,
        fontFamily: typography.fontFamily,
        marginTop: '2px',
      }}>
        {label}
      </p>
    </div>
  </motion.div>
));

StatCard.displayName = 'StatCard';