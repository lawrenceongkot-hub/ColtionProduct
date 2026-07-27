import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
    color: colors.textPrimary,
    border: 'none',
    hoverBackground: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`,
    shadow: shadows.glow,
  },
  secondary: {
    background: colors.bgGlassLight,
    color: colors.textPrimary,
    border: `1px solid ${colors.borderDefault}`,
    hoverBackground: colors.bgGlassMedium,
    shadow: shadows.md,
  },
  ghost: {
    background: 'transparent',
    color: colors.textSecondary,
    border: 'none',
    hoverBackground: colors.bgGlass,
    shadow: 'none',
  },
  outline: {
    background: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    hoverBackground: 'rgba(0, 102, 255, 0.1)',
    shadow: 'none',
  },
};

const sizeStyles = {
  sm: {
    padding: 'clamp(6px, 1.2vh, 8px) clamp(14px, 2vw, 20px)',
    fontSize: typography.sm,
  },
  md: {
    padding: 'clamp(10px, 1.8vh, 14px) clamp(20px, 3vw, 32px)',
    fontSize: typography.base,
  },
  lg: {
    padding: 'clamp(14px, 2.2vh, 18px) clamp(28px, 4vw, 44px)',
    fontSize: typography.md,
  },
};

export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  icon,
  className = '',
}) => {
  const responsive = useResponsive();
  const styles = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(6px, 1vw, 12px)',
        width: fullWidth ? '100%' : 'auto',
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: typography.semibold,
        color: styles.color,
        background: styles.background,
        border: styles.border,
        borderRadius: borderRadius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: styles.shadow,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        transform: `scale(${responsive.scaleFactor})`,
        fontFamily: typography.fontFamily,
      }}
      whileHover={!disabled ? { scale: 1.02, backgroundColor: styles.hoverBackground } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Hover effect overlay */}
      {!disabled && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: styles.hoverBackground,
            opacity: 0,
            borderRadius: borderRadius.md,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Loading spinner */}
      {loading && (
        <motion.div
          style={{
            width: 'clamp(14px, 1.5vw, 20px)',
            height: 'clamp(14px, 1.5vw, 20px)',
            border: `2px solid ${colors.textPrimary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Icon */}
      {icon && !loading && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {icon}
        </span>
      )}

      {/* Text */}
      <span style={{ position: 'relative', zIndex: 1, lineHeight: typography.snug }}>
        {children}
      </span>
    </motion.button>
  );
});

Button.displayName = 'Button';