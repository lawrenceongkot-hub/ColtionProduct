import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { HeroCarousel } from '../components/HeroCarousel';
import { VipCard } from '../components/VipCard';
import { VIP_PLANS } from '../constants';

export const HomeSection: React.FC = React.memo(() => {
  const responsive = useResponsive();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePurchaseComplete = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div
      style={{
        maxWidth: 'clamp(320px, 90vw, 1200px)',
        margin: '0 auto',
        padding: 'clamp(16px, 3vw, 32px)',
        paddingBottom: 'clamp(40px, 5vh, 60px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(32px, 5vh, 48px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <HeroCarousel />
      </motion.div>

      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(16px, 2.5vh, 24px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'clamp(4px, 0.8vh, 8px)',
            textAlign: 'center',
          }}
        >
          <h2 style={{
            fontSize: typography.xxl,
            fontWeight: typography.bold,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
          }}>
            VIP Investment Plans
          </h2>
          <p style={{
            fontSize: typography.base,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily,
            maxWidth: 'clamp(280px, 60vw, 500px)',
          }}>
            Choose the investment level that best matches your financial goals.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: responsive.isMobile
              ? '1fr'
              : responsive.isTablet
                ? '1fr 1fr'
                : 'repeat(3, 1fr)',
            gap: 'clamp(12px, 2vw, 20px)',
            width: '100%',
          }}
        >
            {VIP_PLANS.map((plan, index) => (
              <VipCard key={plan.id + refreshKey} plan={plan as any} index={index} onPurchaseComplete={handlePurchaseComplete} />
            ))}
        </div>
      </motion.div>
    </div>
  );
});

HomeSection.displayName = 'HomeSection';