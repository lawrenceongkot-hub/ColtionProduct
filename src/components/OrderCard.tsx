import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { FORMAT_CURRENCY, FORMAT_PERCENT } from '../constants';
import type { OrderCalculated } from '../types';

interface OrderCardProps {
  order: OrderCalculated;
  index: number;
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

export const OrderCard: React.FC<OrderCardProps> = React.memo(({ order, index }) => {
  const responsive = useResponsive();

  const statusColors = {
    active: { bg: 'rgba(16, 185, 129, 0.1)', text: colors.success, border: 'rgba(16, 185, 129, 0.3)' },
    completed: { bg: 'rgba(59, 130, 246, 0.1)', text: colors.info, border: 'rgba(59, 130, 246, 0.3)' },
  };

  const statusStyle = statusColors[order.displayStatus];

  const purchaseDate = new Date(order.purchaseDate);
  const formattedDate = purchaseDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      style={{
        width: '100%',
        maxWidth: 'clamp(320px, 90vw, 600px)',
        margin: '0 auto',
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
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: shadows.glow }}
    >
      {/* Gradient border top */}
      <div
        style={{
          height: '3px',
          background: badgeGradients[order.vipBadge] || colors.gradientBlue,
          width: '100%',
        }}
      />

      <div
        style={{
          padding: 'clamp(16px, 2.5vw, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(10px, 1.5vh, 16px)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{
              fontSize: typography.lg,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
            }}>
              {order.vipName}
            </h3>
            <span
              style={{
                fontSize: typography.xs,
                fontWeight: typography.semibold,
                color: colors.textPrimary,
                background: badgeGradients[order.vipBadge] || colors.gradientBlue,
                padding: 'clamp(2px, 0.3vh, 4px) clamp(8px, 1vw, 12px)',
                borderRadius: borderRadius.full,
                fontFamily: typography.fontFamily,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}
            >
              {order.vipBadge}
            </span>
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 'clamp(3px, 0.4vh, 5px) clamp(10px, 1.2vw, 14px)',
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              borderRadius: borderRadius.full,
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: statusStyle.text,
              }}
            />
            <span style={{
              fontSize: typography.xs,
              fontWeight: typography.semibold,
              color: statusStyle.text,
              fontFamily: typography.fontFamily,
              textTransform: 'capitalize' as const,
            }}>
              {order.displayStatus}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: colors.borderDefault }} />

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(8px, 1.2vw, 14px)',
          }}
        >
          <StatItem label="Buy Amount" value={FORMAT_CURRENCY(order.buyAmount)} />
          <StatItem label="Daily Rate" value={FORMAT_PERCENT(order.dailyRate)} />
          <StatItem label="Daily Profit" value={FORMAT_CURRENCY(order.dailyProfitPerDay)} />
          <StatItem label="Duration" value={`${order.duration} Days`} />
          <StatItem label="Total Return" value={FORMAT_CURRENCY(order.totalReturn)} highlight />
          <StatItem label="Purchase Date" value={formattedDate} />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: colors.borderDefault }} />

        {/* Profit & Progress Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1.2vh, 14px)',
          }}
        >
          {/* Current Accumulated Profit */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{
              fontSize: typography.sm,
              color: colors.textTertiary,
              fontFamily: typography.fontFamily,
            }}>
              Current Accumulated Profit
            </span>
            <span style={{
              fontSize: typography.lg,
              fontWeight: typography.bold,
              color: colors.success,
              fontFamily: typography.fontFamily,
            }}>
              {FORMAT_CURRENCY(order.displayProfit)}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: 'clamp(4px, 0.6vh, 6px)',
              background: colors.bgGlassLight,
              borderRadius: borderRadius.full,
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.success})`,
                borderRadius: borderRadius.full,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${(order.displayCompletedDays / order.duration) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Days Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            <span style={{
              fontSize: typography.sm,
              color: colors.textSecondary,
              fontFamily: typography.fontFamily,
            }}>
              {order.displayCompletedDays} / {order.duration} Days
            </span>
            <span style={{
              fontSize: typography.sm,
              color: colors.textTertiary,
              fontFamily: typography.fontFamily,
            }}>
              {order.daysRemaining} Days Remaining
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

OrderCard.displayName = 'OrderCard';

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