import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../context/AuthContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { VipCard } from '../components/VipCard';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { VIP_PLANS } from '../constants';

export const HomeScreen: React.FC = React.memo(() => {
  const { user, logout } = useAuth();
  const responsive = useResponsive();

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: colors.bgPrimary,
      }}
    >
      {/* Top Navigation Bar - sticky to viewport */}
      <div
        className="safe-area-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(12px, 2vh, 16px) clamp(16px, 3vw, 32px)',
          borderBottom: `1px solid ${colors.borderDefault}`,
          background: colors.bgSecondary,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <Logo size="sm" />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 1.5vw, 16px)',
        }}>
          <span style={{
            fontSize: typography.sm,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily,
            display: responsive.isMobile ? 'none' : 'block',
          }}>
            {user?.fullName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Content - uses native browser scrolling */}
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
        {/* Hero Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <HeroCarousel />
        </motion.div>

        {/* VIP Investment Plans */}
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
          {/* Section Header */}
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

          {/* Plans Grid */}
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
              <VipCard key={plan.id} plan={plan as any} index={index} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Safe area bottom */}
      <div className="safe-area-bottom" />
    </div>
  );
});

HomeScreen.displayName = 'HomeScreen';