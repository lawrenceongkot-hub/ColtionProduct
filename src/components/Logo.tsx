import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { APP_NAME, APP_TAGLINE } from '../constants';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

const shieldIconSizes = { sm: 32, md: 40, lg: 56, xl: 72 };
const logoFontSizes = { sm: typography.lg, md: typography.xxl, lg: typography.huge, xl: typography.massive };
const taglineFontSizes = { sm: typography.xs, md: typography.sm, lg: typography.base, xl: typography.md };

export const Logo: React.FC<LogoProps> = React.memo(({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const responsive = useResponsive();
  const shieldSize = shieldIconSizes[size];
  const logoSize = logoFontSizes[size];
  const taglineSize = taglineFontSizes[size];

  const scale = responsive.scaleFactor;

  return (
    <motion.div
      className={`logo-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(4px, 1.5vh, 12px)',
        transform: `scale(${scale})`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Premium Financial Shield Icon */}
      <motion.svg
        width={shieldSize}
        height={shieldSize}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
        animate={{
          scale: [1, 1.04, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A3A6B" />
            <stop offset="40%" stopColor="#0047CC" />
            <stop offset="100%" stopColor="#00B4D8" />
          </linearGradient>
          <filter id="shieldGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0047CC" floodOpacity="0.5" />
          </filter>
        </defs>
        {/* Shield body */}
        <motion.path
          d="M36 4C36 4 12 14 12 28V42L36 68L60 42V28C60 14 36 4 36 4Z"
          fill="url(#shieldGradient)"
          filter="url(#shieldGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
        />
        {/* Vertical line (chart axis) */}
        <motion.line
          x1="36" y1="18" x2="36" y2="54"
          stroke={colors.textPrimary}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.6 }}
        />
        {/* Chart line going up */}
        <motion.path
          d="M24 40C24 40 30 34 36 38C42 42 48 30 48 30"
          stroke={colors.textPrimary}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.8 }}
        />
        {/* Center dot (growth marker) */}
        <motion.circle
          cx="36" cy="36" r="3"
          fill={colors.textPrimary}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 1.2 }}
        />
      </motion.svg>

      {/* App Name */}
      <motion.h1
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: typography.bold,
          fontSize: logoSize,
          color: colors.textPrimary,
          letterSpacing: '-0.02em',
          lineHeight: typography.tight,
          textAlign: 'center',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
      >
        {APP_NAME}
      </motion.h1>

      {/* Tagline */}
      {showTagline && (
        <motion.p
          style={{
            fontFamily: typography.fontFamily,
            fontWeight: typography.medium,
            fontSize: taglineSize,
            color: colors.textSecondary,
            letterSpacing: '0.05em',
            lineHeight: typography.snug,
            textAlign: 'center',
            opacity: 0.8,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
        >
          {APP_TAGLINE}
        </motion.p>
      )}
    </motion.div>
  );
});

Logo.displayName = 'Logo';