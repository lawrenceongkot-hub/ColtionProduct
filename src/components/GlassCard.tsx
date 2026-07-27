import React from 'react';
import { motion } from 'framer-motion';
import { colors, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  maxWidth?: string;
  blur?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = React.memo(({
  children,
  className = '',
  padding = 'clamp(24px, 4vw, 40px)',
  maxWidth = 'clamp(320px, 90vw, 480px)',
  blur = '20px',
  onClick,
}) => {
  const responsive = useResponsive();

  return (
    <motion.div
      className={className}
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth,
        padding,
        background: colors.gradientGlass,
        backdropFilter: `blur(${blur})`,
        WebkitBackdropFilter: `blur(${blur})`,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.lg,
        position: 'relative',
        overflow: 'hidden',
        transform: `scale(${responsive.scaleFactor})`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Glass shine effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}
      />
      {children}
    </motion.div>
  );
});

GlassCard.displayName = 'GlassCard';