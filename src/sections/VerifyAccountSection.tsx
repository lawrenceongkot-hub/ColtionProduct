import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { verificationService, isMobileValid, type VerificationStatus } from '../services/verificationService';
import { apiService } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Props {
  onBack: () => void;
}

import { TELEGRAM_LINKS } from '../constants';
const TELEGRAM_SUPPORT_URL = TELEGRAM_LINKS.support;

export const VerifyAccountSection: React.FC<Props> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const s = await verificationService.getStatus(user.id);
      setStatus(s);
      if (s) setMobileInput(s.mobileNumber || '');
    } catch {
      // Keep existing state
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus, user]);

  if (!user) return null;

  const isVerified = status?.status === 'APPROVED';
  const isPending = status?.status === 'PENDING';
  const isRejected = status?.status === 'REJECTED';
  const isGoogleUser = !user.phone;
  const hasCode = !!status?.verificationCode;

  const mobileIsValid = isMobileValid(mobileInput);
  const emailExists = !!user.email;
  const mobileExists = isGoogleUser ? mobileInput.length > 0 : (user.phone || mobileInput).length > 0;
  // For manual registration, use existing phone unless user provided a new one
  const effectiveMobile = isGoogleUser ? mobileInput : (mobileInput || user.phone);
  const mobileIsValidForGen = isMobileValid(effectiveMobile);
  const canGenerate = emailExists && mobileExists && mobileIsValidForGen;

  const handleMobileChange = (v: string) => {
    setMobileInput(v.replace(/[^0-9]/g, '').slice(0, 11));
    setError(null);
  };

  const handleGenerateCode = useCallback(async () => {
    if (!user || !canGenerate) return;
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      // Save phone FIRST to the user profile so the backend has it
      if (effectiveMobile) {
        try {
          console.log('=== VERIFY STEP 1: Saving mobile number to /users/profile');
          await apiService.put('/users/profile', { phone: effectiveMobile });
          console.log('=== VERIFY STEP 2: Mobile number saved successfully');
        } catch (e: any) {
          console.error('=== VERIFY STEP 2: Failed to save mobile number', e?.message || e);
          setError(e?.message || 'Failed to save mobile number. Please try again.');
          setIsGenerating(false);
          return;
        }
      }

      // Now generate the code — get the EXACT backend error if it fails
      console.log('=== VERIFY STEP 3: Calling verificationService.generateCode');
      const result = await verificationService.generateCode(effectiveMobile);
      if (!result.ok || !result.data) {
        // Show the exact backend error message
        setError(result.error || 'Unable to generate verification code.');
        console.error('=== VERIFY STEP 4: generateCode failed:', result.error);
        setIsGenerating(false);
        return;
      }
      console.log('=== VERIFY STEP 4: generateCode succeeded');
      setStatus(result.data);
      setSuccess('Verification code generated successfully.');
      setIsGenerating(false);
    } catch (e: any) {
      console.error('=== VERIFY STEP 5: Unexpected error during generation', e?.message || e);
      setError(e?.message || 'Failed to generate verification code. Please try again.');
      setIsGenerating(false);
    }
  }, [user, canGenerate, effectiveMobile]);

  const maskMobile = (mobile: string) => {
    if (mobile.length < 4) return mobile;
    const first = mobile.slice(0, 2);
    const last = mobile.slice(-2);
    const masked = '*'.repeat(mobile.length - 4);
    return `${first}${masked}${last}`;
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
        <BackButton onClick={onBack} />
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(32px, 4vw, 48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <motion.div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${colors.bgGlassLight}`, borderTopColor: colors.primary }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Loading verification status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <BackButton onClick={onBack} />

      <motion.div
        style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(24px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 3vh, 28px)' }}
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 'clamp(48px, 6vw, 56px)', height: 'clamp(48px, 6vw, 56px)', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
              Verify Your Account
            </h2>
            <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: '2px' }}>
              Complete your account verification.
            </p>
          </div>
        </div>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(14px, 2vw, 18px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Email</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{user.email}</span>
              {user.email && <span style={{ color: colors.success, fontSize: '14px' }}>✓</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'NONE'} />
          </div>
        </div>

        {/* Mobile Number */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(14px, 2vw, 18px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Mobile Number</span>
            {(isGoogleUser ? mobileInput : user.phone) ? (
              <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
                {isGoogleUser ? maskMobile(mobileInput) : maskMobile(user.phone)}
              </span>
            ) : (
              <span style={{ fontSize: typography.sm, color: colors.warning, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>
                Not provided
              </span>
            )}
          </div>

          {/* Inline validation: Email required */}
          {!emailExists && (
            <p style={{ fontSize: typography.xs, color: colors.error, fontFamily: typography.fontFamily, marginTop: '4px' }}>
              Email is required for verification.
            </p>
          )}

          {/* Mobile Number input — REQUIRED (never optional) */}
          {!hasCode && (
            <div style={{ marginTop: '4px' }}>
              <Input
                label={isGoogleUser ? 'Mobile Number *' : 'Mobile Number *'}
                type="text"
                placeholder="09171234567"
                value={mobileInput}
                onChange={handleMobileChange}
                required
                maxLength={11}
              />
              {/* Inline validation: Mobile required */}
              {!mobileInput && (
                <p style={{ fontSize: typography.xs, color: colors.error, fontFamily: typography.fontFamily, marginTop: '4px' }}>
                  Mobile number is required for verification.
                </p>
              )}
              {/* Inline validation: format */}
              {mobileInput && !mobileIsValidForGen && (
                <p style={{ fontSize: typography.xs, color: colors.error, fontFamily: typography.fontFamily, marginTop: '4px' }}>
                  Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g., 09171234567).
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'NONE'} />
          </div>
        </div>

        {/* Rejected message */}
        {isRejected && (
          <div style={{ padding: 'clamp(10px, 1.5vh, 14px) clamp(14px, 2vw, 18px)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: borderRadius.md, fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>
            Your previous verification request was rejected. Please contact support.
          </div>
        )}

        {/* Error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Success */}
        <AnimatePresence mode="wait">
          {success && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} style={{ fontSize: typography.sm, color: colors.success, fontFamily: typography.fontFamily, textAlign: 'center', fontWeight: typography.semibold }}>
              {success}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Pending info */}
        {isPending && status?.verificationCode && (
          <div style={{ padding: 'clamp(14px, 2vw, 18px)', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: borderRadius.lg, textAlign: 'center' }}>
            <p style={{ fontSize: typography.sm, color: colors.warning, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>
              Your Verification Code
            </p>
            <p style={{ fontSize: typography.xxl, fontWeight: typography.bold, color: colors.primary, fontFamily: typography.fontFamilyMono, letterSpacing: '0.15em', wordBreak: 'break-all', marginTop: '8px' }}>
              {status.verificationCode}
            </p>
            <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '8px' }}>
              This code is permanent and never changes. Please contact Telegram support for approval.
            </p>
          </div>
        )}

        {/* Verified message */}
        {isVerified && (
          <div style={{ padding: 'clamp(12px, 1.8vh, 16px)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: borderRadius.md, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span style={{ fontSize: typography.sm, color: colors.success, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>
              Your account is already verified.
            </span>
          </div>
        )}

        {/* Generate Code Button */}
        {!isVerified && !hasCode && (
          <>
            {!canGenerate && (
              <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center', marginBottom: '-12px' }}>
                Complete your Email and Mobile Number before generating your verification code.
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={isGenerating}
              disabled={!canGenerate}
              onClick={handleGenerateCode}
            >
              Generate Verification Code
            </Button>
          </>
        )}

        {/* Code exists but disabled button */}
        {!isVerified && hasCode && (
          <Button variant="secondary" size="lg" fullWidth disabled>
            ✓ Verification Code Generated
          </Button>
        )}

        {/* Telegram Support */}
        {!isVerified && (
          <motion.a
            href={TELEGRAM_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: 'clamp(12px, 1.8vh, 16px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md, cursor: 'pointer', fontSize: typography.base, fontWeight: typography.semibold, color: colors.primary, fontFamily: typography.fontFamily, textDecoration: 'none' }}
            whileHover={{ background: colors.bgGlass }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Contact Telegram Support
          </motion.a>
        )}
      </motion.div>
    </div>
  );
});

VerifyAccountSection.displayName = 'VerifyAccountSection';

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
    whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
  </motion.button>
);

const StatusBadge: React.FC<{ status: 'PENDING' | 'APPROVED' | 'NONE' }> = ({ status }) => {
  const config = {
    PENDING: { bg: 'rgba(234,179,8,0.1)', text: colors.warning, border: 'rgba(234,179,8,0.3)', label: 'Pending' },
    APPROVED: { bg: 'rgba(16,185,129,0.1)', text: colors.success, border: 'rgba(16,185,129,0.3)', label: 'Verified' },
    NONE: { bg: colors.bgGlass, text: colors.textTertiary, border: colors.borderDefault, label: 'Not Verified' },
  };
  const c = config[status];
  return (
    <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, padding: '2px 10px', borderRadius: borderRadius.full, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontFamily: typography.fontFamily }}>
      {c.label}
    </span>
  );
};