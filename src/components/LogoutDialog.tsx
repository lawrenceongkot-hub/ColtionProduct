import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { Button } from './Button';

interface LogoutDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutDialog: React.FC<LogoutDialogProps> = React.memo(({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(16px, 4vw, 32px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background: colors.overlay,
            }}
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog */}
          <motion.div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: 'clamp(300px, 80vw, 400px)',
              background: colors.bgCard,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: borderRadius.xl,
              boxShadow: shadows.xl,
              padding: 'clamp(24px, 4vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(16px, 2.5vh, 24px)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Icon */}
            <div
              style={{
                width: 'clamp(48px, 6vw, 56px)',
                height: 'clamp(48px, 6vw, 56px)',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: typography.xl,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
              textAlign: 'center',
            }}>
              Logout
            </h3>

            {/* Message */}
            <p style={{
              fontSize: typography.base,
              color: colors.textSecondary,
              fontFamily: typography.fontFamily,
              textAlign: 'center',
              lineHeight: typography.snug,
            }}>
              Are you sure you want to logout?
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: 'clamp(8px, 1.5vw, 12px)',
              width: '100%',
            }}>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={onConfirm}
              >
                Logout
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

LogoutDialog.displayName = 'LogoutDialog';