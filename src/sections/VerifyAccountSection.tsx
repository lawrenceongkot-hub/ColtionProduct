import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { verificationService } from '../services/verificationService';
import { Button } from '../components/Button';
import type { VerificationRequest } from '../types';

interface Props {
  onBack: () => void;
}

export const VerifyAccountSection: React.FC<Props> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCreated, setHasCreated] = useState(false);

  // Reload request from service
  const loadRequest = useCallback(async () => {
    if (!user) return null;
    const existing = await verificationService.getRequest(user.id);
    setRequest(existing);
    return existing;
  }, [user]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  if (!user) return null;

  const isVerified = request?.status === 'APPROVED';
  const isPending = request?.status === 'PENDING';
  const isRejected = request?.status === 'REJECTED';

  const maskMobile = (mobile: string) => {
    if (mobile.length < 4) return mobile;
    const first = mobile.slice(0, 2);
    const last = mobile.slice(-2);
    const masked = '*'.repeat(mobile.length - 4);
    return `${first}${masked}${last}`;
  };

  const handleVerifyNow = useCallback(async () => {
    if (!user) return;

    // Check if already has pending request
    const hasPending = await verificationService.hasPendingRequest(user.id);
    if (hasPending) {
      loadRequest();
      return;
    }

    // Check if already verified
    const verified = await verificationService.isVerified(user.id);
    if (verified) {
      loadRequest();
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await verificationService.createRequest(user.id, user.email, user.phone);
    if (!result) {
      setError('Unable to create verification request. Please try again later.');
      setIsLoading(false);
      return;
    }

    setRequest(result);
    setHasCreated(true);
    setIsLoading(false);
  }, [user, loadRequest]);

  // Show the verification code created view
  if (hasCreated && request) {
    return (
      <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
        <BackButton onClick={() => { setHasCreated(false); onBack(); }} />
        <motion.div
          style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(24px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 3vh, 28px)' }}
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        >
          {/* Success Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <div style={{ width: 'clamp(56px, 8vw, 72px)', height: 'clamp(56px, 8vw, 72px)', borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
              Verification Request Created
            </h2>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, maxWidth: 'clamp(260px, 70vw, 400px)' }}>
              Please send this verification code to the official Telegram Admin account for approval.
            </p>
          </div>

          {/* Verification Code */}
          <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.lg, textAlign: 'center' }}>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>
              Your Verification Code
            </p>
            <p style={{ fontSize: typography.xxl, fontWeight: typography.bold, color: colors.primary, fontFamily: typography.fontFamilyMono, letterSpacing: '0.15em', wordBreak: 'break-all' }}>
              {request.verificationCode}
            </p>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.warning }} />
            <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.warning, fontFamily: typography.fontFamily }}>
              Waiting for Approval
            </span>
          </div>

          <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center' }}>
            Expires: {new Date(request.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>

          <Button variant="secondary" size="md" fullWidth onClick={() => { setHasCreated(false); loadRequest(); }}>
            Check Status
          </Button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Email</span>
            <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{user.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'NONE'} />
          </div>
        </div>

        {/* Mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(14px, 2vw, 18px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Mobile Number</span>
            <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{maskMobile(user.phone)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StatusBadge status={isVerified ? 'APPROVED' : isPending ? 'PENDING' : 'NONE'} />
          </div>
        </div>

        {/* Rejected message */}
        {isRejected && (
          <div style={{ padding: 'clamp(10px, 1.5vh, 14px) clamp(14px, 2vw, 18px)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: borderRadius.md, fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>
            Your previous verification request was rejected. You can submit a new request.
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

        {/* Pending info */}
        {isPending && (
          <div style={{ padding: 'clamp(12px, 1.8vh, 16px)', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: borderRadius.md, textAlign: 'center' }}>
            <p style={{ fontSize: typography.sm, color: colors.warning, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>
              You already have a pending verification request.
            </p>
            <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, marginTop: '4px' }}>
              Code: {request!.verificationCode}
            </p>
            <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>
              Expires: {new Date(request!.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

        {/* Verify Button */}
        {!isVerified && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onClick={handleVerifyNow}
          >
            {isPending ? 'View Existing Request' : 'Verify Now'}
          </Button>
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