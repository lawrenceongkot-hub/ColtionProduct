import React from 'react';
import { motion } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { colors, typography } from '../theme';
import { APP_VERSION } from '../constants';
import type { AuthNavigation } from '../types';

export const AuthWelcomeScreen: React.FC<AuthNavigation> = React.memo(({ onNavigate, onPrivacy, onTerms }) => {
  return (
    <ScreenLayout justifyContent="center">
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%',
          gap: 'clamp(24px, 4vh, 48px)',
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

        {/* Glass Card */}
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
                  Login
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