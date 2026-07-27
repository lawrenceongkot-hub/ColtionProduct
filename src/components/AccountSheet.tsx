import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const AccountSheet: React.FC<AccountSheetProps> = React.memo(({
  isOpen,
  onClose,
  onLogout,
}) => {
  const { user } = useAuth();

  const initials = user?.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <motion.div
            style={{ position: 'absolute', inset: 0, background: colors.overlay }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet */}
          <motion.div
            className="safe-area-bottom"
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: '500px',
              background: colors.bgCard,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              borderTop: `1px solid ${colors.borderDefault}`,
              boxShadow: shadows.xl,
              padding: 'clamp(24px, 4vw, 32px)',
              paddingBottom: 'clamp(24px, 4vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(16px, 2.5vh, 24px)',
            }}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Handle */}
            <div
              style={{
                width: 'clamp(32px, 6vw, 40px)',
                height: '4px',
                background: colors.borderDefault,
                borderRadius: borderRadius.full,
                flexShrink: 0,
              }}
            />

            {/* Avatar */}
            <div
              style={{
                width: 'clamp(64px, 10vw, 80px)',
                height: 'clamp(64px, 10vw, 80px)',
                borderRadius: '50%',
                background: colors.gradientBlue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typography.xxl,
                fontWeight: typography.bold,
                color: colors.textPrimary,
              }}
            >
              {initials}
            </div>

            {/* User Info */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: typography.lg,
                fontWeight: typography.bold,
                color: colors.textPrimary,
                fontFamily: typography.fontFamily,
              }}>
                {user?.fullName}
              </h3>
              <p style={{
                fontSize: typography.sm,
                color: colors.textTertiary,
                fontFamily: typography.fontFamily,
                marginTop: '4px',
              }}>
                {user?.email}
              </p>
            </div>

            {/* Divider */}
            <div style={{ width: '100%', height: '1px', background: colors.borderDefault }} />

            {/* Logout */}
            <motion.button
              onClick={() => {
                onClose();
                setTimeout(() => onLogout(), 300);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: 'clamp(12px, 1.8vh, 16px)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontSize: typography.base,
                color: colors.error,
                fontFamily: typography.fontFamily,
                fontWeight: typography.semibold,
              }}
              whileHover={{ background: 'rgba(239, 68, 68, 0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AccountSheet.displayName = 'AccountSheet';