import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { walletService } from '../services/walletService';
import { TransactionHistorySection } from './TransactionHistorySection';
import { VerifyAccountSection } from './VerifyAccountSection';
import { ChangePasswordSection } from './ChangePasswordSection';
import { DepositScreen } from '../screens/DepositScreen';
import { WithdrawScreen } from '../screens/WithdrawScreen';
import { AgentSection } from './AgentSection';
import { verificationService } from '../services/verificationService';
import { orderService } from '../services/orderService';
import { FORMAT_CURRENCY } from '../constants';

type AccountPage = 'dashboard' | 'transactions' | 'verify' | 'password' | 'deposit' | 'withdraw' | 'agent';

export const AccountSection: React.FC = React.memo(() => {
  const { user } = useAuth();
  const responsive = useResponsive();
  const [page, setPage] = useState<AccountPage>('dashboard');
  const [balances, setBalances] = useState({ main: 0, semWallet: 0, ongoing: 0 });
  const [isVerified, setIsVerified] = useState(false);
  const [ongoingBalance, setOngoingBalance] = useState(0);

  useEffect(() => {
    if (user) {
      const w = walletService.getBalancesSync(user.id);
      setBalances(w);
      setIsVerified(verificationService.isVerified(user.id));
      // Ongoing Wallet = accumulated profits from active VIP plans
      setOngoingBalance(orderService.getOngoingWalletBalance(user.id));
    }
  }, [user]);

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (page === 'transactions') {
    return <TransactionHistorySection onBack={() => setPage('dashboard')} />;
  }
  if (page === 'verify') {
    return <VerifyAccountSection onBack={() => setPage('dashboard')} />;
  }
  if (page === 'password') {
    return <ChangePasswordSection onBack={() => setPage('dashboard')} />;
  }
  if (page === 'deposit') {
    return <DepositScreen onBack={() => setPage('dashboard')} />;
  }
  if (page === 'withdraw') {
    return <WithdrawScreen onBack={() => setPage('dashboard')} />;
  }
  if (page === 'agent') {
    return <AgentSection onBack={() => setPage('dashboard')} />;
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
      {/* Profile Header */}
      <motion.div
        style={{
          width: '100%',
          background: colors.gradientGlass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.xl,
          padding: 'clamp(20px, 3vw, 28px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(16px, 2.5vw, 24px)',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          style={{
            width: 'clamp(56px, 8vw, 72px)',
            height: 'clamp(56px, 8vw, 72px)',
            borderRadius: '50%',
            background: colors.gradientBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typography.xxl,
            fontWeight: typography.bold,
            color: colors.textPrimary,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: typography.lg,
            fontWeight: typography.bold,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
          }}>
            {user.fullName}
          </h2>
          <p style={{
            fontSize: typography.xs,
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
            marginTop: '2px',
          }}>
            User ID: {user.displayId}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: isVerified ? colors.success : colors.warning,
            }} />
            <span style={{
              fontSize: typography.xs,
              fontWeight: typography.semibold,
              color: isVerified ? colors.success : colors.warning,
              fontFamily: typography.fontFamily,
            }}>
              {isVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Wallet Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: responsive.isDesktop ? 'repeat(3, 1fr)' : responsive.isTablet ? 'repeat(2, 1fr)' : '1fr',
        gap: 'clamp(10px, 1.5vw, 16px)',
      }}>
        <WalletCard
          title="Main Wallet"
          balance={balances.main}
          description="Available balance for deposits, withdrawals, and VIP purchases."
          gradient="linear-gradient(135deg, rgba(0,51,204,0.2), rgba(0,102,255,0.1))"
          delay={0}
        />
        <WalletCard
          title="SemWallet"
          balance={balances.semWallet}
          description="Deposit bonuses and promotional credits."
          gradient="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))"
          delay={0.05}
        />
        <WalletCard
          title="Ongoing Wallet"
          balance={ongoingBalance}
          description="VIP daily profits locked until investment period completion."
          gradient="linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.1))"
          delay={0.1}
        />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: responsive.isMobile ? '1fr 1fr' : '1fr 1fr',
        gap: 'clamp(10px, 1.5vw, 16px)',
      }}>
        <motion.button
          onClick={() => setPage('deposit')}
          style={{
            padding: 'clamp(14px, 2vh, 18px)',
            background: colors.gradientBlue,
            border: 'none',
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            fontSize: typography.base,
            fontWeight: typography.semibold,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            boxShadow: shadows.glow,
          }}
          whileHover={{ opacity: 0.9 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Deposit
          </div>
        </motion.button>
        <motion.button
          onClick={() => setPage('withdraw')}
          style={{
            padding: 'clamp(14px, 2vh, 18px)',
            background: colors.bgGlassMedium,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            fontSize: typography.base,
            fontWeight: typography.semibold,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
          }}
          whileHover={{ background: colors.bgGlassLight }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Withdraw
          </div>
        </motion.button>
      </div>

      {/* Menu Items */}
      <motion.div
        style={{
          width: '100%',
          background: colors.gradientGlass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <MenuItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          label="Transaction History"
          subtitle="View all deposits, withdrawals, investments, and commissions"
          onClick={() => setPage('transactions')}
          borderBottom
        />
        <MenuItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          label="Verify Your Account"
          subtitle="Complete identity verification to unlock additional features"
          onClick={() => setPage('verify')}
          borderBottom
          rightElement={
            <span style={{
              fontSize: typography.xs, fontWeight: typography.semibold,
              color: isVerified ? colors.success : colors.warning, fontFamily: typography.fontFamily,
              background: isVerified ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)',
              padding: '2px 10px', borderRadius: borderRadius.full,
              border: `1px solid ${isVerified ? 'rgba(16,185,129,0.3)' : 'rgba(234,179,8,0.3)'}`,
            }}>
              {isVerified ? 'Verified' : 'Not Verified'}
            </span>
          }
        />
        <MenuItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="Agent Invitation"
          subtitle="Invite friends and earn 30% commission on their first deposit"
          onClick={() => setPage('agent')}
          borderBottom
        />
        <MenuItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          label="Change Password"
          subtitle="Securely change your account password"
          onClick={() => setPage('password')}
        />
      </motion.div>
    </div>
  );
});

AccountSection.displayName = 'AccountSection';

const WalletCard: React.FC<{ title: string; balance: number; description: string; gradient: string; delay: number }> = React.memo(({ title, balance, description, gradient, delay }) => (
  <motion.div
    style={{
      background: colors.gradientGlass,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${colors.borderDefault}`,
      borderRadius: borderRadius.lg,
      padding: 'clamp(14px, 2vw, 20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(8px, 1.2vh, 12px)',
      position: 'relative',
      overflow: 'hidden',
    }}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -2, boxShadow: shadows.md }}
  >
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: gradient, pointerEvents: 'none',
    }} />
    <p style={{
      fontSize: typography.sm, fontWeight: typography.semibold,
      color: colors.textSecondary, fontFamily: typography.fontFamily,
      position: 'relative', zIndex: 1,
    }}>
      {title}
    </p>
    <p style={{
      fontSize: typography.xxl, fontWeight: typography.bold,
      color: colors.textPrimary, fontFamily: typography.fontFamily,
      position: 'relative', zIndex: 1,
    }}>
      {FORMAT_CURRENCY(balance)}
    </p>
    <p style={{
      fontSize: typography.xs, color: colors.textTertiary,
      fontFamily: typography.fontFamily, lineHeight: typography.snug,
      position: 'relative', zIndex: 1,
    }}>
      {description}
    </p>
  </motion.div>
));

WalletCard.displayName = 'WalletCard';

const MenuItem: React.FC<{
  icon: React.ReactNode; label: string; subtitle: string;
  onClick: () => void; borderBottom?: boolean; rightElement?: React.ReactNode;
}> = React.memo(({ icon, label, subtitle, onClick, borderBottom, rightElement }) => (
  <motion.button
    onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.8vw, 16px)',
      padding: 'clamp(14px, 2vh, 18px) clamp(16px, 2.5vw, 24px)',
      background: 'transparent', border: 'none', cursor: 'pointer',
      borderBottom: borderBottom ? `1px solid ${colors.borderDefault}` : 'none',
      textAlign: 'left',
    }}
    whileHover={{ background: colors.bgGlass }}
  >
    <div style={{
      width: 'clamp(40px, 4.5vw, 44px)', height: 'clamp(40px, 4.5vw, 44px)',
      borderRadius: borderRadius.md, background: colors.bgGlassMedium,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        fontSize: typography.base, fontWeight: typography.semibold,
        color: colors.textPrimary, fontFamily: typography.fontFamily,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: typography.xs, color: colors.textTertiary,
        fontFamily: typography.fontFamily, marginTop: '2px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {subtitle}
      </p>
    </div>
    {rightElement}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </motion.button>
));

MenuItem.displayName = 'MenuItem';