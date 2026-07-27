import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface MobileBottomNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'order', label: 'Order', icon: 'order' },
  { id: 'invite', label: 'Invite', icon: 'invite' },
  { id: 'account', label: 'Account', icon: 'account' },
];

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  order: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  invite: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  account: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(({
  activeSection,
  onSectionChange,
}) => {
  const responsive = useResponsive();

  if (!responsive.isMobile) return null;

  return (
    <div
      className="safe-area-bottom"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: colors.gradientGlass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        borderTop: `1px solid ${colors.borderDefault}`,
        boxShadow: shadows.lg,
        padding: 'clamp(6px, 1vh, 10px) clamp(8px, 2vw, 16px)',
        paddingBottom: 'clamp(6px, 1vh, 10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: 'clamp(6px, 1vh, 10px) clamp(10px, 2vw, 16px)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: borderRadius.md,
                position: 'relative',
                minWidth: 'clamp(50px, 20vw, 80px)',
              }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: '2px',
                    background: colors.primary,
                    borderRadius: borderRadius.full,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                style={{
                  color: isActive ? colors.primary : colors.textTertiary,
                  transition: 'color 0.2s ease',
                }}
                animate={{ color: isActive ? colors.primary : colors.textTertiary }}
              >
                {icons[item.icon]}
              </motion.div>
              <span
                style={{
                  fontSize: typography.xs,
                  fontWeight: isActive ? typography.semibold : typography.medium,
                  color: isActive ? colors.primary : colors.textTertiary,
                  fontFamily: typography.fontFamily,
                  transition: 'color 0.2s ease',
                }}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';