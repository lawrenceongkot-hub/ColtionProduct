import React from 'react';
import { motion } from 'framer-motion';
import { colors, borderRadius } from '../theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: string;
  showGlow?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  progress,
  height = 'clamp(4px, 0.8vh, 6px)',
  showGlow = true,
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height,
        background: colors.bgGlassLight,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryLight} 50%, ${colors.accent} 100%)`,
          borderRadius: borderRadius.full,
          position: 'relative',
          boxShadow: showGlow ? `0 0 10px ${colors.primary}40` : 'none',
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Shimmer effect */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            borderRadius: borderRadius.full,
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';