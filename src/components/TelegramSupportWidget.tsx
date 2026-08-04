import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';

/**
 * Floating Telegram Support Widget
 * - Fixed bottom-right, always visible, high z-index
 * - Blue gradient circular button with Telegram official icon
 * - Click opens a popup with two options:
 *   1. TG Customer Service → https://t.me/ColtionSupportOfficial
 *   2. Official Telegram Group → https://t.me/OfficialColtionChannel
 * - Popup closes on: close button, ESC, clicking outside
 */

import { TELEGRAM_LINKS, openTelegramLink } from '../constants';

export const TelegramSupportWidget: React.FC = React.memo(() => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  // ESC key closes the popup
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Click outside closes the popup
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Small delay to avoid closing when clicking the button itself
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <>
      {/* Floating Telegram Button */}
      <motion.button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Telegram Support"
        style={{
          position: 'fixed',
          bottom: 'clamp(80px, 10vh, 100px)', // Above mobile bottom nav
          right: '24px',
          zIndex: 9999,
          width: 'clamp(52px, 6vw, 60px)',
          height: 'clamp(52px, 6vw, 60px)',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
          boxShadow: '0 4px 20px rgba(42, 171, 238, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, boxShadow: '0 6px 28px rgba(42, 171, 238, 0.55)' }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 1 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFFFFF" style={{ display: 'block' }}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </motion.button>

      {/* Popup Card */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popupRef}
            style={{
              position: 'fixed',
              bottom: 'clamp(148px, 18vh, 180px)', // Above the button
              right: '24px',
              zIndex: 10000,
              width: 'clamp(300px, 90vw, 360px)',
              maxHeight: 'calc(100dvh - 200px)',
              overflowY: 'auto',
              background: colors.bgCard,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${colors.borderDefault}`,
              borderRadius: '20px',
              boxShadow: shadows.xl,
              padding: 'clamp(20px, 3vw, 24px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
                  Need Help?
                </h3>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '2px' }}>
                  Choose where you would like to connect.
                </p>
              </div>
              <motion.button
                onClick={handleClose}
                aria-label="Close"
                whileHover={{ background: colors.bgGlass }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: colors.bgGlassMedium,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: colors.borderDefault }} />

            {/* Menu Item 1: TG Customer Service */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
                    TG Customer Service
                  </p>
                  <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '1px' }}>
                    Chat with our customer support team.
                  </p>
                </div>
              </div>
              <motion.a
                href={TELEGRAM_LINKS.support}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  color: '#FFFFFF',
                  fontFamily: typography.fontFamily,
                  textDecoration: 'none',
                }}
              >
                Open Chat
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </motion.a>
            </div>

            {/* Menu Item 2: Official Telegram Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-8 0c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zM8 13c-2.33 0-8 1.17-8 3.5V19h8v-2.5c0-1.17.5-2 1.5-2.83-.83-.42-1.5-.67-1.5-.67z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
                    Official Telegram Group
                  </p>
                  <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '1px' }}>
                    Join our official community.
                  </p>
                </div>
              </div>
              <motion.a
                href={TELEGRAM_LINKS.group}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: colors.bgGlassLight,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  color: colors.primary,
                  fontFamily: typography.fontFamily,
                  textDecoration: 'none',
                }}
              >
                Join Group
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

TelegramSupportWidget.displayName = 'TelegramSupportWidget';