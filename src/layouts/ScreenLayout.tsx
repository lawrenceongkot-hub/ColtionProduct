import React from 'react';
import { motion } from 'framer-motion';
import { colors } from '../theme';

interface ScreenLayoutProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  padding?: string;
  justifyContent?: string;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = React.memo(({
  children,
  className = '',
  gradient = colors.gradientDark,
  padding = 'clamp(12px, 3vw, 32px)',
  justifyContent = 'center',
}) => {
  return (
    <motion.div
      className={className}
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent,
        padding,
        background: gradient,
        position: 'relative',
        overflow: 'visible',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* Animated background orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: 'clamp(200px, 50vw, 600px)',
          height: 'clamp(200px, 50vw, 600px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-15%',
          width: 'clamp(250px, 60vw, 700px)',
          height: 'clamp(250px, 60vw, 700px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accent}10 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(300px, 70vw, 800px)',
          height: 'clamp(300px, 70vw, 800px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primaryDark}08 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Safe area top spacer */}
      <div className="safe-area-top" style={{ width: '100%', flexShrink: 0 }} />

      {/* Main content */}
      <div
        style={{
          width: '100%',
          maxWidth: 'clamp(320px, 100%, 1200px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent,
          flex: 1,
          position: 'relative',
          zIndex: 1,
          gap: 'clamp(16px, 3vh, 32px)',
        }}
      >
        {children}
      </div>

      {/* Safe area bottom spacer */}
      <div className="safe-area-bottom" style={{ width: '100%', flexShrink: 0 }} />
    </motion.div>
  );
});

ScreenLayout.displayName = 'ScreenLayout';