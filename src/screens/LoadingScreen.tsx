import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Logo } from '../components/Logo';
import { ProgressBar } from '../components/ProgressBar';
import { LOADING_DURATION, LOADING_MESSAGES, LOADING_MESSAGE_THRESHOLDS } from '../constants';
import { colors, typography, borderRadius } from '../theme';
import type { LoadingProps } from '../types';

export const LoadingScreen: React.FC<LoadingProps> = React.memo(({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const frameRef = useRef<number>(0);

  const getMessageForProgress = useCallback((pct: number): string => {
    let idx = 0;
    for (let i = LOADING_MESSAGE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (pct >= LOADING_MESSAGE_THRESHOLDS[i].percent) {
        idx = LOADING_MESSAGE_THRESHOLDS[i].messageIndex;
        break;
      }
    }
    return LOADING_MESSAGES[idx];
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const rawProgress = Math.min((elapsed / LOADING_DURATION) * 100, 100);

      if (rawProgress >= 100) {
        setProgress(100);
        setCurrentMessage(LOADING_MESSAGES[LOADING_MESSAGES.length - 1]);
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 600);
        return;
      }

      setProgress(rawProgress);
      setCurrentMessage(getMessageForProgress(rawProgress));
      frameRef.current = requestAnimationFrame(updateProgress);
    };

    frameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [onComplete, getMessageForProgress]);

  return (
    <AnimatePresence mode="wait">
      <ScreenLayout justifyContent="center">
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '100%',
            maxWidth: 'clamp(300px, 80vw, 500px)',
            gap: 'clamp(24px, 4vh, 48px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Logo with pulse */}
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              opacity: [1, 0.85, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Logo size="lg" />
          </motion.div>

          {/* Glass card for loading content */}
          <motion.div
            style={{
              width: '100%',
              padding: 'clamp(24px, 3vw, 36px)',
              background: colors.gradientGlass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.xl,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(20px, 3vh, 32px)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          >
            {/* Status Message */}
            <motion.p
              key={currentMessage}
              style={{
                fontSize: typography.base,
                color: colors.textSecondary,
                fontFamily: typography.fontFamily,
                fontWeight: typography.medium,
                textAlign: 'center',
                minHeight: 'clamp(20px, 3vh, 28px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {currentMessage}
            </motion.p>

            {/* Progress Bar */}
            <div style={{ width: '100%' }}>
              <ProgressBar progress={progress} height="clamp(4px, 0.8vh, 6px)" />
            </div>

            {/* Percentage Counter */}
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <motion.span
                style={{
                  fontSize: typography.xxxl,
                  fontWeight: typography.bold,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 'clamp(60px, 8vw, 100px)',
                  textAlign: 'center',
                }}
              >
                {Math.round(progress)}
              </motion.span>
              <span
                style={{
                  fontSize: typography.xxl,
                  fontWeight: typography.bold,
                  color: colors.primary,
                }}
              >
                %
              </span>
            </motion.div>

            {/* Completion Message */}
            <AnimatePresence mode="wait">
              {isComplete && (
                <motion.div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: 'clamp(8px, 1.5vh, 12px) clamp(16px, 2vw, 24px)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: borderRadius.sm,
                  }}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontSize: typography.sm,
                      color: colors.success,
                      fontWeight: typography.semibold,
                    }}
                  >
                    Loading Complete
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </ScreenLayout>
    </AnimatePresence>
  );
});

LoadingScreen.displayName = 'LoadingScreen';