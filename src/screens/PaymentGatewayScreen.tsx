import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { transactionService } from '../services/transactionService';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { FORMAT_CURRENCY } from '../constants';

interface PaymentGatewayScreenProps {
  reference: string;
  amount: number;
  method: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

/**
 * Payment Gateway Screen
 * Simulates a real payment provider checkout page (like Moxsys/PayMongo).
 * Allows testing the full deposit flow WITHOUT needing admin panel approval.
 */
export const PaymentGatewayScreen: React.FC<PaymentGatewayScreenProps> = React.memo(({
  reference,
  amount,
  method,
  onComplete,
  onCancel,
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [countdown, setCountdown] = useState(300); // 5 minutes = 300 seconds
  const [customError, setCustomError] = useState<string | null>(null);

  // Countdown timer - 5 minutes
  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatCountdown = useCallback((s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePayNow = useCallback(async () => {
    if (!user) return;
    setIsProcessing(true);
    setCustomError(null);
    try {
      await transactionService.simulatePaymentSuccess(reference);
      setStatus('success');
      onComplete(true);
    } catch (e: any) {
      setCustomError(e.message || 'Payment simulation failed');
      setStatus('failed');
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }, [user, reference, onComplete]);

  const handleCancelPayment = useCallback(async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await transactionService.simulatePaymentFailure(reference);
    } catch {
      // Silent - best effort
    } finally {
      setStatus('failed');
      onCancel();
      setIsProcessing(false);
    }
  }, [user, reference, onCancel]);

  const handleBack = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <div style={{
      maxWidth: 'clamp(320px, 90vw, 600px)',
      margin: '0 auto',
      padding: 'clamp(16px, 3vw, 32px)',
      paddingBottom: 'clamp(40px, 5vh, 60px)',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <GlassCard maxWidth="100%">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)', textAlign: 'center', alignItems: 'center' }}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.success, fontFamily: typography.fontFamily }}>
                Payment Successful!
              </h3>
              <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>
                Your deposit of {FORMAT_CURRENCY(amount)} has been credited to your SemWallet.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', textAlign: 'left' }}>
                <Row label="Reference" value={reference} />
                <Row label="Amount" value={FORMAT_CURRENCY(amount)} />
                <Row label="Method" value={method || 'QRPH'} />
                <Row label="Status" value="Success" highlight />
              </div>
              <Button variant="primary" size="md" fullWidth onClick={() => onComplete(true)}>
                Continue
              </Button>
            </motion.div>
          ) : status === 'failed' ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)', textAlign: 'center', alignItems: 'center' }}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.error, fontFamily: typography.fontFamily }}>
                Payment Failed
              </h3>
              <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>
                {customError || 'Your payment could not be completed. Please try again.'}
              </p>
              <Button variant="secondary" size="md" fullWidth onClick={handleBack}>
                Back to Deposit
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary }}>
                  {method ? method[0] : 'M'}
                </div>
                <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
                  {method || 'QRPH'} Payment
                </h2>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>
                  Simulated Payment Gateway
                </p>
              </div>

              {/* Amount */}
              <div style={{
                padding: 'clamp(16px, 2.5vw, 20px)',
                background: colors.bgGlassLight,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.borderDefault}`,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Amount to Pay</p>
                <p style={{ fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, marginTop: '4px' }}>
                  {FORMAT_CURRENCY(amount)}
                </p>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(12px, 2vw, 16px)', background: colors.bgGlassLight, borderRadius: borderRadius.md }}>
                <Row label="Reference" value={reference} />
                <Row label="Payment Method" value={method || 'QRPH'} />
                <Row label="Merchant" value="Coltion Product Investment" />
                <Row label="Expires In" value={formatCountdown(countdown)} warning={countdown < 60} />
              </div>

              {/* Countdown */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '100%', height: '4px', background: colors.bgGlassMedium,
                  borderRadius: borderRadius.full, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(countdown / 300) * 100}%`,
                    height: '100%',
                    background: countdown < 60 ? colors.error : colors.primary,
                    borderRadius: borderRadius.full,
                    transition: 'width 1s linear',
                  }} />
                </div>
                <p style={{
                  fontSize: typography.xs, color: countdown < 60 ? colors.error : colors.textTertiary,
                  fontFamily: typography.fontFamily, marginTop: '6px',
                }}>
                  Complete the payment within {formatCountdown(countdown)} or it will expire.
                </p>
              </div>

              {customError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}
                >
                  {customError}
                </motion.p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button variant="primary" size="lg" fullWidth loading={isProcessing} onClick={handlePayNow}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Pay {FORMAT_CURRENCY(amount)}
                  </span>
                </Button>
                <Button variant="secondary" size="md" fullWidth loading={isProcessing} onClick={handleCancelPayment}>
                  Cancel Payment
                </Button>
              </div>

              <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                🔒 This is a simulated payment gateway for testing. No real money is charged.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
});

PaymentGatewayScreen.displayName = 'PaymentGatewayScreen';

const Row: React.FC<{ label: string; value: string; highlight?: boolean; warning?: boolean }> = ({ label, value, highlight, warning }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{label}</span>
    <span style={{
      fontSize: typography.base,
      fontWeight: highlight ? typography.bold : typography.semibold,
      color: highlight ? colors.success : warning ? colors.error : colors.textPrimary,
      fontFamily: typography.fontFamily,
    }}>{value}</span>
  </div>
);