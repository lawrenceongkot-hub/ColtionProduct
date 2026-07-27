import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Logo } from '../components/Logo';
import { SPLASH_DURATION } from '../constants';
import { colors } from '../theme';
import type { SplashProps } from '../types';

export const SplashScreen: React.FC<SplashProps> = React.memo(({ onComplete }) => {
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(handleComplete, SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, [handleComplete]);

  return (
    <AnimatePresence mode="wait">
      <ScreenLayout
        justifyContent="center"
        gradient={`linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.bgPrimary} 40%, ${colors.bgSecondary} 70%, ${colors.primaryDark} 100%)`}
      >
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 'clamp(8px, 2vh, 16px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              duration: 1,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.2,
            }}
          >
            <Logo size="xl" showTagline />
          </motion.div>

          {/* Bottom fade indicator */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 'clamp(40px, 8vh, 80px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <motion.div
              style={{
                width: 'clamp(20px, 3vw, 32px)',
                height: 'clamp(20px, 3vw, 32px)',
                border: `2px solid ${colors.textSecondary}`,
                borderTop: 'transparent',
                borderRight: 'transparent',
                borderRadius: '50%',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            <span
              style={{
                fontSize: 'clamp(10px, 1.5vw, 12px)',
                color: colors.textTertiary,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
              }}
            >
              Loading...
            </span>
          </motion.div>
        </motion.div>
      </ScreenLayout>
    </AnimatePresence>
  );
});

SplashScreen.displayName = 'SplashScreen';