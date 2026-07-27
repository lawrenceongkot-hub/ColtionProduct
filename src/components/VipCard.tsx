import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../context/AuthContext';
import { vipPurchaseService } from '../services/vipPurchaseService';
import { Button } from './Button';
import { FORMAT_CURRENCY, FORMAT_PERCENT } from '../constants';
import type { VipPlan } from '../types';

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

  const handleBuy = async () => {
    if (!user) return;
    setIsBuying(true);
    setError(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const result = vipPurchaseService.purchasePlan(user.id, plan);
    if (result.success) {
      setError(null);
      if (onPurchaseComplete) onPurchaseComplete();
    } else {
      setError(result.error || 'Purchase failed.');
    }
    setIsBuying(false);
  };

  return (
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
  );
});

VipCard.displayName = 'VipCard';

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