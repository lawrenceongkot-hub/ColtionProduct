import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { OrderCard } from '../components/OrderCard';
import { Button } from '../components/Button';
import type { OrderCalculated } from '../types';

export const OrderSection: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderCalculated[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const userOrders = await orderService.getUserOrders(user.id);
      setOrders(userOrders);
    } catch {
      setOrders([]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Refresh orders when tab becomes visible (handles returning after midnight)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadOrders]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'clamp(300px, 50vh, 500px)',
        }}
      >
        <motion.div
          style={{
            width: 'clamp(32px, 4vw, 40px)',
            height: 'clamp(32px, 4vw, 40px)',
            border: `3px solid ${colors.borderDefault}`,
            borderTopColor: colors.primary,
            borderRadius: '50%',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div
        style={{
          maxWidth: 'clamp(320px, 90vw, 600px)',
          margin: '0 auto',
          padding: 'clamp(48px, 8vw, 80px) clamp(16px, 3vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'clamp(400px, 60vh, 600px)',
          gap: 'clamp(20px, 3vh, 32px)',
          textAlign: 'center',
        }}
      >
        {/* Empty State Illustration */}
        <motion.div
          style={{
            width: 'clamp(80px, 15vw, 120px)',
            height: 'clamp(80px, 15vw, 120px)',
            borderRadius: '50%',
            background: colors.bgGlassMedium,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </motion.div>

        <motion.div
          style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 12px)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 style={{
            fontSize: typography.xl,
            fontWeight: typography.bold,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
          }}>
            No Active Investments
          </h2>
          <p style={{
            fontSize: typography.base,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily,
            lineHeight: typography.relaxed,
            maxWidth: 'clamp(280px, 70vw, 400px)',
          }}>
            Purchase a VIP Investment Plan to start earning daily profits.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              // Navigate to Home section to see VIP plans
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }));
            }}
          >
            Explore VIP Plans
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 'clamp(320px, 90vw, 800px)',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px)',
        paddingBottom: 'clamp(40px, 5vh, 60px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(16px, 2.5vh, 24px)',
      }}
    >
      {/* Header */}
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(4px, 0.8vh, 8px)',
          textAlign: 'center',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 style={{
          fontSize: typography.xl,
          fontWeight: typography.bold,
          color: colors.textPrimary,
          fontFamily: typography.fontFamily,
        }}>
          My Investments
        </h2>
        <p style={{
          fontSize: typography.sm,
          color: colors.textTertiary,
          fontFamily: typography.fontFamily,
        }}>
          {orders.length} {orders.length === 1 ? 'investment' : 'investments'} found
        </p>
      </motion.div>

      {/* Order Cards */}
      {orders.map((order, index) => (
        <OrderCard key={order.id} order={order} index={index} />
      ))}

      {/* Bottom spacer */}
      <div style={{ height: 'clamp(20px, 3vh, 40px)' }} />
    </div>
  );
});

OrderSection.displayName = 'OrderSection';