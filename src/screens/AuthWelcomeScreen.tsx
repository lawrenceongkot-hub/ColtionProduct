import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { colors, typography } from '../theme';
import { APP_VERSION, FORMAT_CURRENCY } from '../constants';
import { api } from '../services/api';
import type { AuthNavigation } from '../types';

interface LandingStats {
  totalUsers: number;
  totalInvestments: number;
  latestInvestors: Array<{ id: string; fullName: string; displayId: string; amount: number; date: string }>;
  latestInvestments: Array<{ id: string; fullName: string; displayId: string; amount: number; plan: string; date: string }>;
  topInvestors: Array<{ userId: string; fullName: string; displayId: string; totalInvested: number }>;
  recentRegistrations: Array<{ id: string; fullName: string; displayId: string; date: string }>;
  displaySettings: {
    totalUsersDisplay: number;
    totalInvestmentsDisplay: number;
    activeInvestorsDisplay: number;
    enableLatestInvestors: boolean;
    enableTopInvestors: boolean;
    enableLiveCounter: boolean;
    enableAnimatedNumbers: boolean;
  };
}

const DEFAULT_STATS: LandingStats = {
  totalUsers: 0,
  totalInvestments: 0,
  latestInvestors: [],
  latestInvestments: [],
  topInvestors: [],
  recentRegistrations: [],
  displaySettings: {
    totalUsersDisplay: 0,
    totalInvestmentsDisplay: 0,
    activeInvestorsDisplay: 0,
    enableLatestInvestors: true,
    enableTopInvestors: true,
    enableLiveCounter: true,
    enableAnimatedNumbers: true,
  },
};

// Animated counter component
const AnimatedNumber: React.FC<{ value: number; enabled: boolean; prefix?: string }> = ({ value, enabled, prefix = '' }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, enabled]);

  return <span>{prefix}{display.toLocaleString()}</span>;
};

export const AuthWelcomeScreen: React.FC<AuthNavigation> = React.memo(({ onNavigate, onPrivacy, onTerms }) => {
  const [stats, setStats] = useState<LandingStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await api<LandingStats>('/landing/stats', { skipAuth: true });
      if (data) setStats(data);
    } catch {
      // Keep defaults on failure
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const { displaySettings } = stats;
  const totalUsersDisplay = displaySettings?.totalUsersDisplay || stats.totalUsers;
  const totalInvestmentsDisplay = displaySettings?.totalInvestmentsDisplay || stats.totalInvestments;

  return (
    <ScreenLayout justifyContent="center">
      {/* Upper Right - Sign In / Sign Up */}
      <motion.div
        style={{
          position: 'absolute',
          top: 'clamp(16px, 3vh, 24px)',
          right: 'clamp(16px, 3vw, 32px)',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <button
          onClick={() => onNavigate('login')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: 'transparent',
            border: `1px solid ${colors.borderLight}`,
            color: colors.textPrimary,
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            fontFamily: typography.fontFamily,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.bgGlassLight; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Sign In
        </button>
        <button
          onClick={() => onNavigate('register')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: colors.gradientBlue,
            border: 'none',
            color: '#FFFFFF',
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            fontFamily: typography.fontFamily,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,102,255,0.3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Sign Up
        </button>
      </motion.div>

      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%',
          gap: 'clamp(24px, 4vh, 48px)',
          paddingTop: 'clamp(60px, 8vh, 80px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <Logo size="lg" showTagline />
        </motion.div>

        {/* Live Statistics Section */}
        <motion.div
          style={{
            width: '100%',
            maxWidth: 'clamp(320px, 90vw, 800px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(16px, 2.5vh, 24px)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Key Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'clamp(10px, 1.5vw, 16px)',
          }}>
            <GlassCard maxWidth="100%" padding="clamp(14px, 2vw, 20px)">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginBottom: '4px' }}>Total Users</div>
                <div style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.primary, fontFamily: typography.fontFamily }}>
                  <AnimatedNumber value={totalUsersDisplay} enabled={displaySettings?.enableAnimatedNumbers ?? true} />
                </div>
              </div>
            </GlassCard>
            <GlassCard maxWidth="100%" padding="clamp(14px, 2vw, 20px)">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginBottom: '4px' }}>Total Investments</div>
                <div style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.success, fontFamily: typography.fontFamily }}>
                  <AnimatedNumber value={totalInvestmentsDisplay} enabled={displaySettings?.enableAnimatedNumbers ?? true} prefix="₱" />
                </div>
              </div>
            </GlassCard>
            <GlassCard maxWidth="100%" padding="clamp(14px, 2vw, 20px)">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginBottom: '4px' }}>Active Investors</div>
                <div style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.warning, fontFamily: typography.fontFamily }}>
                  <AnimatedNumber value={displaySettings?.activeInvestorsDisplay || stats.latestInvestors?.length || 0} enabled={displaySettings?.enableAnimatedNumbers ?? true} />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Latest Investors - hidden when toggle is OFF */}
          {displaySettings?.enableLatestInvestors !== false && stats.latestInvestors && stats.latestInvestors.length > 0 && (
            <GlassCard maxWidth="100%" padding="clamp(14px, 2vw, 20px)">
              <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: '12px' }}>
                Latest Investors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.latestInvestors.slice(0, 10).map((inv, i) => (
                  <div key={inv.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: colors.bgGlassLight }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.xs, fontWeight: typography.bold, color: '#FFFFFF' }}>
                        {inv.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{inv.fullName}</div>
                        <div style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{inv.displayId}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: typography.sm, fontWeight: typography.bold, color: colors.success, fontFamily: typography.fontFamily }}>
                      {FORMAT_CURRENCY(inv.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Top Investors - hidden when toggle is OFF */}
          {displaySettings?.enableTopInvestors !== false && stats.topInvestors && stats.topInvestors.length > 0 && (
            <GlassCard maxWidth="100%" padding="clamp(14px, 2vw, 20px)">
              <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: '12px' }}>
                Top Investors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.topInvestors.slice(0, 5).map((inv, i) => (
                  <div key={inv.userId || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: colors.bgGlassLight }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.xs, fontWeight: typography.bold, color: i < 3 ? '#0A0E1A' : colors.textPrimary }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: typography.sm, fontWeight: typography.medium, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{inv.fullName}</span>
                    </div>
                    <span style={{ fontSize: typography.sm, fontWeight: typography.bold, color: colors.primary, fontFamily: typography.fontFamily }}>
                      {FORMAT_CURRENCY(inv.totalInvested)}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Recent Registrations - REMOVED per privacy requirement */}
        </motion.div>

        {/* Glass Card with CTA */}
        <GlassCard maxWidth="clamp(320px, 90vw, 480px)">
          <motion.div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(20px, 3vh, 32px)',
            }}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.2 },
              },
            }}
          >
            {/* Title */}
            <motion.h1
              style={{
                fontSize: typography.xxl,
                fontWeight: typography.bold,
                color: colors.textPrimary,
                fontFamily: typography.fontFamily,
                textAlign: 'center',
                lineHeight: typography.tight,
              }}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
            >
              Welcome to Coltion Product
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              style={{
                fontSize: typography.base,
                color: colors.textSecondary,
                fontFamily: typography.fontFamily,
                textAlign: 'center',
                lineHeight: typography.relaxed,
                maxWidth: 'clamp(260px, 70vw, 400px)',
              }}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
            >
              Invest with confidence through a secure, modern, and intelligent investment platform designed to help you grow your financial future.
            </motion.p>

            {/* Buttons */}
            <motion.div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(10px, 1.5vh, 16px)',
                width: '100%',
              }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 },
                },
              }}
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('login')}
                >
                  Sign In
                </Button>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('register')}
                >
                  Create Account
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </GlassCard>

        {/* Bottom Links */}
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'clamp(8px, 1vh, 12px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'clamp(16px, 3vw, 24px)',
              alignItems: 'center',
            }}
          >
            <button
              onClick={onPrivacy}
              style={{
                fontSize: typography.sm,
                color: colors.textTertiary,
                fontFamily: typography.fontFamily,
                fontWeight: typography.medium,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                padding: '4px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.textTertiary; }}
            >
              Privacy Policy
            </button>
            <span style={{ color: colors.textMuted, fontSize: typography.xs }}>•</span>
            <button
              onClick={onTerms}
              style={{
                fontSize: typography.sm,
                color: colors.textTertiary,
                fontFamily: typography.fontFamily,
                fontWeight: typography.medium,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                padding: '4px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = colors.textTertiary; }}
            >
              Terms & Conditions
            </button>
          </div>
          <span
            style={{
              fontSize: typography.xs,
              color: colors.textMuted,
              fontFamily: typography.fontFamily,
              fontWeight: typography.regular,
            }}
          >
            {APP_VERSION}
          </span>
        </motion.div>
      </motion.div>
    </ScreenLayout>
  );
});

AuthWelcomeScreen.displayName = 'AuthWelcomeScreen';