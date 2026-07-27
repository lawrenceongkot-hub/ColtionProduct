import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { dashboardService, triggerDashboardUpdate, DASHBOARD_UPDATE_EVENT } from '../services/dashboardService';
import type { DashboardStats } from '../services/dashboardService';
import { StatCard } from '../dashboard/StatCard';
import { adminAuth } from '../services/adminAuth';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const SectionSeparator: React.FC<{ title: string; subtitle?: string }> = React.memo(({ title, subtitle }) => (
  <div style={{ marginBottom: '16px' }}>
    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.3px' }}>
      {title}
    </h2>
    {subtitle && (
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", marginTop: '4px' }}>
        {subtitle}
      </p>
    )}
  </div>
));

SectionSeparator.displayName = 'SectionSeparator';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = React.memo(({ onNavigate, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventRef = useRef<string>('');
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  console.log('=== ADMIN DASHBOARD RENDER #' + renderCountRef.current + ' ===');
  console.log('loading:', loading);
  console.log('stats:', stats);
  console.log('stats?.totalUsers:', stats?.totalUsers);

  const session = adminAuth.getSession();
  const adminName = session?.name || 'Admin';
  const adminRole = session?.role || 'Administrator';

  // Fetch stats from actual storage
  const fetchStats = useCallback(() => {
    console.log('fetchStats() called - reading from localStorage...');
    
    // DEBUG: Direct localStorage read
    const rawUsers = localStorage.getItem('coltion_users');
    console.log('RAW localStorage coltion_users:', rawUsers);
    const parsed = rawUsers ? JSON.parse(rawUsers) : [];
    console.log('PARSED users:', parsed);
    console.log('PARSED user count:', parsed.length);
    
    const newStats = dashboardService.getStats();
    console.log('STATS from getStats():', JSON.stringify(newStats));
    console.log('STATS.totalUsers:', newStats.totalUsers);
    console.log('(should match localStorage length:', parsed.length, ')');
    
    setStats(newStats);
    setCurrentTime(dashboardService.getCurrentTime());
  }, []);

  // On mount: check localStorage directly, then fetch
  useEffect(() => {
    console.log('useEffect [fetchStats] - MOUNTED');
    console.log('Direct localStorage check at mount:');
    try {
      const raw = localStorage.getItem('coltion_users');
      const users = raw ? JSON.parse(raw) : [];
      console.log('coltion_users at mount:', JSON.stringify(users));
      console.log('user count at mount:', users.length);
    } catch (e) {
      console.error('Error reading coltion_users at mount:', e);
    }
    
    fetchStats();
    const timer = setTimeout(() => setLoading(false), 400);
    return () => {
      console.log('useEffect cleanup - clearing timeout');
      clearTimeout(timer);
    };
  }, [fetchStats]);

  // Polling fallback every 10 seconds
  useEffect(() => {
    pollingRef.current = setInterval(fetchStats, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStats]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      console.log('STORAGE EVENT FIRED:', e.key, e.newValue?.substring(0, 100));
      const keys = ['coltion_users', 'coltion_transactions', 'coltion_orders', 'coltion_verifications', 'coltion_events'];
      if (keys.includes(e.key || '')) {
        console.log('Storage event match - refetching stats');
        fetchStats();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchStats]);

  // Listen for custom dashboard update events (same-tab)
  useEffect(() => {
    const handleCustom = () => {
      console.log('CUSTOM DASHBOARD:UPDATE EVENT FIRED');
      fetchStats();
    };
    window.addEventListener(DASHBOARD_UPDATE_EVENT, handleCustom);
    return () => window.removeEventListener(DASHBOARD_UPDATE_EVENT, handleCustom);
  }, [fetchStats]);

  // Clock update
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(dashboardService.getCurrentTime()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Expose triggerDashboardUpdate globally
  useEffect(() => {
    (window as any).__triggerDashboardUpdate = triggerDashboardUpdate;
    return () => { delete (window as any).__triggerDashboardUpdate; };
  }, []);

  if (loading || !stats) {
    console.log('RENDERING SKELETON. loading:', loading, 'stats:', !!stats);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#0A0E1A' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(17,24,39,0.8)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ width: '200px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ width: '100px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </header>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                background: 'rgba(26,34,53,0.6)', borderRadius: '16px', padding: '20px',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '14px' }} />
                <div style={{ width: '60%', height: '26px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }} />
                <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  console.log('RENDERING FULL DASHBOARD with stats.totalUsers =', stats.totalUsers);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#0A0E1A' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(17,24,39,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
            Operations Dashboard
          </h1>
          <span style={{
            fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif",
            background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '6px',
          }}>
            Live
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif",
            fontWeight: 500, padding: '4px 10px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {currentTime}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '8px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
            <span style={{ fontSize: '10px', color: '#10B981', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Live</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 10px 4px 4px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0066FF, #00D4FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif",
            }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#E5E7EB', fontFamily: "'Inter', sans-serif" }}>{adminName}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>{adminRole}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        {/* Last updated indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px',
          marginBottom: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif",
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          Last updated: {formatTime(stats.lastUpdated)}
        </div>

        {/* ===== FIRST ROW - User Statistics ===== */}
        <SectionSeparator title="User Statistics" subtitle="Real-time user metrics synchronized with the platform" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}
        >
          <StatCard icon="users" label="Total Users" value={stats.totalUsers} gradient="linear-gradient(135deg, #1a1a3e, #0D0D2B)" color="#0066FF" />
          <StatCard icon="online" label="Online Users" value={stats.onlineUsers} gradient="linear-gradient(135deg, #0D3320, #0A0E1A)" color="#10B981" />
          <StatCard icon="newUser" label="New Users Today" value={stats.newUsersToday} gradient="linear-gradient(135deg, #1A2D1A, #0A0E1A)" color="#34D399" />
          <StatCard icon="verified" label="Verified Users" value={stats.verifiedUsers} gradient="linear-gradient(135deg, #0D2B33, #0A0E1A)" color="#06B6D4" />
          <StatCard icon="pending" label="Pending Verification" value={stats.pendingVerification} gradient="linear-gradient(135deg, #332B0D, #0A0E1A)" color="#F59E0B" />
          <StatCard icon="banned" label="Suspended / Banned" value={stats.suspendedBanned} gradient="linear-gradient(135deg, #331A1A, #0A0E1A)" color="#EF4444" />
        </motion.div>

        {/* ===== SECOND ROW - Financial Statistics ===== */}
        <SectionSeparator title="Financial Statistics" subtitle="Real-time financial totals from the platform" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}
        >
          <StatCard icon="deposit" label="Total Deposits" value={stats.totalDeposits} prefix="₱" gradient="linear-gradient(135deg, #0D1B33, #0A0E1A)" color="#0066FF" />
          <StatCard icon="withdrawal" label="Total Withdrawals" value={stats.totalWithdrawals} prefix="₱" gradient="linear-gradient(135deg, #331A1A, #0A0E1A)" color="#EF4444" />
          <StatCard icon="revenue" label="Net Revenue" value={stats.netRevenue} prefix="₱" gradient="linear-gradient(135deg, #0D3320, #0A0E1A)" color="#10B981" />
          <StatCard icon="bonus" label="Welcome Bonuses Issued" value={stats.totalWelcomeBonuses} prefix="₱" gradient="linear-gradient(135deg, #2D1B33, #0A0E1A)" color="#EC4899" />
          <StatCard icon="referral" label="Referral Commissions" value={stats.totalReferralCommissions} prefix="₱" gradient="linear-gradient(135deg, #1B332D, #0A0E1A)" color="#14B8A6" />
          <StatCard icon="balance" label="Total Wallet Balance" value={stats.totalWalletBalance} prefix="₱" gradient="linear-gradient(135deg, #1A1A3E, #0A0E1A)" color="#8B5CF6" />
        </motion.div>

        {/* ===== THIRD ROW - Investment Statistics ===== */}
        <SectionSeparator title="Investment Statistics" subtitle="Current investment status from active orders" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}
        >
          <StatCard icon="vip" label="VIP Members" value={stats.activeVIPMembers} gradient="linear-gradient(135deg, #1A2D1A, #0A0E1A)" color="#F59E0B" />
          <StatCard icon="orders" label="Active Investment Orders" value={stats.activeInvestmentOrders} gradient="linear-gradient(135deg, #0D1B33, #0A0E1A)" color="#0066FF" />
          <StatCard icon="invested" label="Total Investment Amount" value={stats.totalInvestedAmount} prefix="₱" gradient="linear-gradient(135deg, #1A1A3E, #0A0E1A)" color="#8B5CF6" />
          <StatCard icon="profit" label="Daily Profit Distributed Today" value={stats.dailyProfitDistributedToday} prefix="₱" gradient="linear-gradient(135deg, #0D3320, #0A0E1A)" color="#10B981" />
          <StatCard icon="completing" label="Investments Completing Today" value={stats.investmentsCompletingToday} gradient="linear-gradient(135deg, #332B0D, #0A0E1A)" color="#F59E0B" />
          <StatCard icon="orders" label="Running Investment Plans" value={stats.runningInvestmentPlans} gradient="linear-gradient(135deg, #0D2B33, #0A0E1A)" color="#06B6D4" />
        </motion.div>

        {/* ===== FOURTH ROW - Pending Actions ===== */}
        <SectionSeparator title="Pending Actions" subtitle="Items requiring administrator attention" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}
        >
          <StatCard icon="pendingDeposit" label="Pending Deposits" value={stats.pendingDeposits} gradient="linear-gradient(135deg, #0D1B33, #0A0E1A)" color="#0066FF" onClick={() => onNavigate('deposits')} />
          <StatCard icon="pendingWithdrawal" label="Pending Withdrawals" value={stats.pendingWithdrawals} gradient="linear-gradient(135deg, #331A1A, #0A0E1A)" color="#EF4444" onClick={() => onNavigate('withdrawals')} />
          <StatCard icon="kyc" label="Pending KYC Verification" value={stats.pendingKYC} gradient="linear-gradient(135deg, #332B0D, #0A0E1A)" color="#F59E0B" onClick={() => onNavigate('verification')} />
          <StatCard icon="failed" label="Failed Transactions" value={stats.failedTransactions} gradient="linear-gradient(135deg, #331A1A, #0A0E1A)" color="#EF4444" />
          <StatCard icon="tickets" label="Pending Support Requests" value={stats.pendingSupportRequests} gradient="linear-gradient(135deg, #1A1A3E, #0A0E1A)" color="#8B5CF6" />
        </motion.div>
      </div>

      {/* Footer */}
      <footer style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Coltion Product Investment
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif" }}>
            Version 1.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(16,185,129,0.7)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Database Connected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(16,185,129,0.7)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Server Online</span>
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontFamily: "'Inter', sans-serif" }}>
            &copy; 2026
          </span>
        </div>
      </footer>
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';