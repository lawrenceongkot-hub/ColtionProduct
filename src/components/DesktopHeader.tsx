import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

interface DesktopHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  showLogoutConfirm: () => void;
}

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'order', label: 'Order' },
  { id: 'invite', label: 'Invite' },
  { id: 'account', label: 'Account' },
];

export const DesktopHeader: React.FC<DesktopHeaderProps> = React.memo(({
  activeSection,
  onSectionChange,
  showLogoutConfirm,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const responsive = useResponsive();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (responsive.isMobile) return null;

  const initials = user?.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div
      className="safe-area-top"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: colors.gradientGlass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.borderDefault}`,
        boxShadow: shadows.md,
      }}
    >
      <div
        style={{
          maxWidth: 'clamp(320px, 95vw, 1400px)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(8px, 1.2vh, 12px) clamp(16px, 3vw, 32px)',
          gap: 'clamp(16px, 3vw, 40px)',
        }}
      >
        {/* Logo */}
        <Logo size="sm" />

        {/* Center Navigation */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(4px, 0.5vw, 8px)',
          }}
        >
          {navItems.map(item => (
            <motion.button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              style={{
                position: 'relative',
                padding: 'clamp(6px, 1vh, 10px) clamp(12px, 1.5vw, 20px)',
                fontSize: typography.sm,
                fontWeight: activeSection === item.id ? typography.semibold : typography.medium,
                color: activeSection === item.id ? colors.textPrimary : colors.textSecondary,
                fontFamily: typography.fontFamily,
                background: 'transparent',
                border: 'none',
                borderRadius: borderRadius.sm,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              whileHover={{ color: colors.textPrimary, background: colors.bgGlass }}
              whileTap={{ scale: 0.95 }}
            >
              {item.label}
              {activeSection === item.id && (
                <motion.div
                  layoutId="navIndicator"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '30%',
                    right: '30%',
                    height: '2px',
                    background: colors.primary,
                    borderRadius: borderRadius.full,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Profile Section */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setProfileOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: colors.bgGlass,
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.full,
              padding: 'clamp(4px, 0.6vh, 6px) clamp(4px, 0.6vh, 6px) clamp(4px, 0.6vh, 6px) clamp(10px, 1.2vw, 14px)',
              cursor: 'pointer',
              fontFamily: typography.fontFamily,
            }}
            whileHover={{ background: colors.bgGlassLight }}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{
              fontSize: typography.sm,
              color: colors.textSecondary,
              fontWeight: typography.medium,
              display: responsive.isTablet ? 'none' : 'block',
            }}>
              {user?.fullName?.split(' ')[0]}
            </span>
            <div
              style={{
                width: 'clamp(28px, 3vw, 34px)',
                height: 'clamp(28px, 3vw, 34px)',
                borderRadius: '50%',
                background: colors.gradientBlue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typography.xs,
                fontWeight: typography.bold,
                color: colors.textPrimary,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '180px',
                  background: colors.bgCard,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${colors.borderDefault}`,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.lg,
                  overflow: 'hidden',
                  zIndex: 200,
                }}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {/* User info */}
                <div style={{
                  padding: 'clamp(12px, 1.5vh, 16px)',
                  borderBottom: `1px solid ${colors.borderDefault}`,
                }}>
                  <p style={{
                    fontSize: typography.base,
                    fontWeight: typography.semibold,
                    color: colors.textPrimary,
                    fontFamily: typography.fontFamily,
                  }}>
                    {user?.fullName}
                  </p>
                  <p style={{
                    fontSize: typography.sm,
                    color: colors.textTertiary,
                    fontFamily: typography.fontFamily,
                    marginTop: '2px',
                  }}>
                    {user?.email}
                  </p>
                </div>

                {/* Logout */}
                <motion.button
                  onClick={() => {
                    setProfileOpen(false);
                    showLogoutConfirm();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: typography.sm,
                    color: colors.error,
                    fontFamily: typography.fontFamily,
                    fontWeight: typography.medium,
                  }}
                  whileHover={{ background: 'rgba(239, 68, 68, 0.08)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

DesktopHeader.displayName = 'DesktopHeader';