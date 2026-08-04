import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../context/AuthContext';
import { vipPurchaseService } from '../services/vipPurchaseService';
import { Button } from './Button';
import { FORMAT_CURRENCY, FORMAT_PERCENT } from '../constants';
import type { VipPlan, InvestmentOrder } from '../types';

interface VipCardProps {
  plan: VipPlan;
  index: number;
  onPurchaseComplete?: () => void;
}

const badgeGradients: Record<string, string> = {
  Starter: 'linear-gradient(135deg, #4B5563, #6B7280)',
  Bronze: 'linear-gradient(135deg, #8B4513, #CD7F32)',
  Silver: 'linear-gradient(135deg, #808080, #C0C0C0)',
  Gold: 'linear-gradient(135deg, #B8860B, #FFD700)',
  Platinum: 'linear-gradient(135deg, #808080, #E5E4E2)',
  Diamond: 'linear-gradient(135deg, #00B4D8, #B9F2FF)',
  Elite: 'linear-gradient(135deg, #0033CC, #0047CC)',
  Premium: 'linear-gradient(135deg, #5C2E00, #8B4513)',
  Luxury: 'linear-gradient(135deg, #0A0E1A, #1A1A2E)',
  Royal: 'linear-gradient(135deg, #2D0A3E, #4A0E4E)',
  Exclusive: 'linear-gradient(135deg, #B8860B, #FFD700)',
};

export const VipCard: React.FC<VipCardProps> = React.memo(({ plan, index, onPurchaseComplete }) => {
  const { user } = useAuth();
  const responsive = useResponsive();
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<InvestmentOrder | null>(null);

  const handleBuy = async () => {
    if (!user) return;
    setIsBuying(true);
    setError(null);

    const result = await vipPurchaseService.purchasePlan(user.id, plan);
    if (result.success && result.order) {
      setError(null);
      // ISSUE 4: Show animated confirmation modal only after backend confirms
      setSuccessOrder(result.order);
      if (onPurchaseComplete) onPurchaseComplete();
    } else {
      setError(result.error || 'Purchase failed.');
    }
    setIsBuying(false);
  };

  const closeSuccessModal = () => {
    setSuccessOrder(null);
  };

  return (
    <>
      <motion.div
        style={{
          width: '100%',
          background: colors.gradientGlass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          position: 'relative',
          transform: `scale(${responsive.scaleFactor})`,
        }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
        whileHover={{ y: -4, boxShadow: shadows.glow }}
      >
        {/* Gradient border top */}
        <div
          style={{
            height: '3px',
            background: badgeGradients[plan.badge] || colors.gradientBlue,
            width: '100%',
          }}
        />

        <div
          style={{
            padding: 'clamp(16px, 2.5vw, 24px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1.2vh, 12px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'clamp(4px, 0.5vh, 8px)',
            }}
          >
            <h3 style={{
              fontSize: typography.lg,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
            }}>
              {plan.name}
            </h3>
            <span
              style={{
                fontSize: typography.xs,
                fontWeight: typography.semibold,
                color: colors.textPrimary,
                background: badgeGradients[plan.badge] || colors.gradientBlue,
                padding: 'clamp(2px, 0.3vh, 4px) clamp(8px, 1vw, 12px)',
                borderRadius: borderRadius.full,
                fontFamily: typography.fontFamily,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}
            >
              {plan.badge}
            </span>
          </div>

          {/* Buy Amount */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
            }}
          >
            <span style={{
              fontSize: typography.xxl,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
            }}>
              {FORMAT_CURRENCY(plan.buyAmount)}
            </span>
            <span style={{
              fontSize: typography.sm,
              color: colors.textTertiary,
              fontFamily: typography.fontFamily,
            }}>
              buy amount
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: colors.borderDefault }} />

          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'clamp(8px, 1vw, 12px)',
            }}
          >
            <StatItem label="Daily Rate" value={FORMAT_PERCENT(plan.dailyRate)} />
            <StatItem label="Daily Profit" value={FORMAT_CURRENCY(plan.dailyProfit)} />
            <StatItem label="Duration" value={`${plan.duration} Days`} />
            <StatItem label="Total Return" value={FORMAT_CURRENCY(plan.totalReturn)} highlight />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: typography.xs,
              color: colors.error,
              fontFamily: typography.fontFamily,
              textAlign: 'center',
              marginTop: '4px',
            }}>
              {error}
            </p>
          )}

          {/* Buy Button */}
          <Button
            variant="primary"
            size="sm"
            fullWidth
            loading={isBuying}
            onClick={handleBuy}
          >
            Buy Now
          </Button>
        </div>
      </motion.div>

      {/* ISSUE 4: Animated Success Modal */}
      <AnimatePresence>
        {successOrder && (
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
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
            <motion.div
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: 'clamp(320px, 80vw, 440px)',
                background: colors.bgCard,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: borderRadius.xl,
                boxShadow: shadows.xl,
                padding: 'clamp(28px, 4vw, 40px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'clamp(14px, 2vh, 20px)',
                textAlign: 'center',
              }}
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Success Checkmark Animation */}
              <motion.div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  border: `2px solid ${colors.success}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <motion.svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.success}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <motion.polyline
                    points="20 6 9 17 4 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  />
                </motion.svg>
              </motion.div>

              <motion.h3
                style={{
                  fontSize: typography.lg,
                  fontWeight: typography.bold,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                VIP Plan Purchased Successfully
              </motion.h3>

              <motion.div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: 'clamp(14px, 2vw, 20px)',
                  background: colors.bgGlassLight,
                  border: `1px solid ${colors.borderDefault}`,
                  borderRadius: borderRadius.md,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <SuccessRow label="Investment Amount" value={FORMAT_CURRENCY(successOrder.buyAmount)} />
                <SuccessRow label="Daily Rate" value={FORMAT_PERCENT(successOrder.dailyRate)} />
                <SuccessRow label="Duration" value={`${successOrder.duration} Days`} />
                <SuccessRow label="Start Date" value={new Date(successOrder.purchaseDate).toLocaleDateString()} />
                <SuccessRow
                  label="End Date"
                  value={new Date(new Date(successOrder.purchaseDate).getTime() + successOrder.duration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                />
                <SuccessRow label="Expected Profit" value={FORMAT_CURRENCY(successOrder.totalReturn - successOrder.buyAmount)} highlight />
              </motion.div>

              <motion.button
                onClick={closeSuccessModal}
                style={{
                  width: '100%',
                  padding: 'clamp(10px, 1.5vh, 14px)',
                  borderRadius: borderRadius.md,
                  background: colors.gradientBlue,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: typography.base,
                  fontWeight: typography.semibold,
                  fontFamily: typography.fontFamily,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,102,255,0.3)',
                  transition: 'all 0.2s ease',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

VipCard.displayName = 'VipCard';

const SuccessRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{label}</span>
    <span style={{ fontSize: typography.sm, fontWeight: highlight ? typography.bold : typography.semibold, color: highlight ? colors.success : colors.textPrimary, fontFamily: typography.fontFamily }}>
      {value}
    </span>
  </div>
);

const StatItem: React.FC<{ label: string; value: string; highlight?: boolean }> = React.memo(({ label, value, highlight }) => (
  <div>
    <p style={{
      fontSize: typography.xs,
      color: colors.textTertiary,
      fontFamily: typography.fontFamily,
      marginBottom: '2px',
    }}>
      {label}
    </p>
    <p style={{
      fontSize: typography.base,
      fontWeight: highlight ? typography.bold : typography.semibold,
      color: highlight ? colors.success : colors.textPrimary,
      fontFamily: typography.fontFamily,
    }}>
      {value}
    </p>
  </div>
));

StatItem.displayName = 'StatItem';