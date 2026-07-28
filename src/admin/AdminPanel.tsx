import React, { useState, useCallback, useEffect } from 'react';
import { AdminLogin } from './pages/AdminLogin';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminAgents } from './pages/AdminAgents';
import { AdminDeposits } from './pages/AdminDeposits';
import { AdminWithdrawals } from './pages/AdminWithdrawals';
import { AdminOrders } from './pages/AdminOrders';
import { AdminVerification } from './pages/AdminVerification';
import { AdminSettings } from './pages/AdminSettings';
import { AdminTransactions } from './pages/AdminTransactions';
import { ErrorBoundary } from './components/ErrorBoundary';
import { adminAuth } from './services/adminAuth';
import { isAdminAuthenticated } from './services/adminApi';

export const AdminPanel: React.FC = React.memo(() => {
  const [authenticated, setAuthenticated] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated());
    setLoading(false);
  }, []);

  const handleLogin = useCallback(() => setAuthenticated(true), []);
  const handleLogout = useCallback(() => { adminAuth.logout(); setAuthenticated(false); }, []);
  const handleNavigate = useCallback((p: string) => setPage(p), []);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0E1A' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#0066FF', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <AdminDashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
      case 'users': return <AdminUsers />;
      case 'agents': return <AdminAgents />;
      case 'deposits': return <AdminDeposits />;
      case 'withdrawals': return <AdminWithdrawals />;
      case 'orders': return <AdminOrders />;
      case 'verification': return <AdminVerification />;
      case 'settings': return <AdminSettings />;
      case 'transactions': return <AdminTransactions />;
      default: return <AdminDashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
    }
  };

  return (
    <ErrorBoundary>
      <AdminLayout activePage={page} onNavigate={handleNavigate} onLogout={handleLogout}>
        {renderPage()}
      </AdminLayout>
    </ErrorBoundary>
  );
});

AdminPanel.displayName = 'AdminPanel';