import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userManagementService } from '../services/userManagementService';

type SortField = 'fullName' | 'email' | 'status' | 'kycStatus' | 'createdAt' | 'displayId';
type SortDir = 'asc' | 'desc';

interface UserData {
  id: string;
  displayId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  kycStatus: string;
  verificationStatus: string;
  registrationDate: string;
  lastLogin: string;
  lastLoginIp: string;
  device: string;
  referralCode: string;
  invitationCode: string;
  referredBy: string;
  referrerDisplayId: string;
  referrerFullName: string;
  referrerInvitationCode: string;
  createdAt: number;
  isDemo?: boolean;
  wallet: { main: number; semWallet: number; ongoing: number };
}

const CONFIRM_ACTIONS: Record<string, { title: string; message: string; color: string }> = {
  ban: { title: 'Ban Account', message: 'This will immediately log out the user and block future logins.', color: '#EF4444' },
  unban: { title: 'Unban Account', message: 'Restore access to this user account.', color: '#10B981' },
  suspend: { title: 'Suspend Account', message: 'Temporarily restrict this user account.', color: '#F59E0B' },
  activate: { title: 'Activate Account', message: 'Reactivate this user account.', color: '#10B981' },
  forceLogout: { title: 'Force Logout', message: 'Destroy all active sessions for this user.', color: '#F59E0B' },
  changePassword: { title: 'Change Password', message: 'This will invalidate the old password and force login with new password.', color: '#0066FF' },
  addMain: { title: 'Add Main Wallet', message: 'Credit the user Main Wallet balance.', color: '#10B981' },
  deductMain: { title: 'Deduct Main Wallet', message: 'Debit the user Main Wallet balance.', color: '#EF4444' },
  addSem: { title: 'Add SemWallet', message: 'Credit the user SemWallet balance.', color: '#10B981' },
  deductSem: { title: 'Deduct SemWallet', message: 'Debit the user SemWallet balance.', color: '#EF4444' },
};

export const AdminUsers: React.FC = React.memo(() => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreateDemo, setShowCreateDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    mainBalance: '0',
    semBalance: '0',
    ongoingBalance: '0',
    verificationStatus: 'NONE',
    invitationCode: '',
    referrer: '',
  });
  const [demoFormError, setDemoFormError] = useState('');
  const [demoFormSuccess, setDemoFormSuccess] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [walletBalances, setWalletBalances] = useState<{ main: number; semWallet: number; ongoing: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string } | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const perPage = 20;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    const data = await userManagementService.getUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Poll for changes every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Listen for dashboard update events
  useEffect(() => {
    const handler = () => fetchUsers();
    window.addEventListener('dashboard:update', handler);
    return () => window.removeEventListener('dashboard:update', handler);
  }, [fetchUsers]);

  // Filtering
  const filtered = useMemo(() => {
    let list = userManagementService.searchUsers(search, users);
    list = userManagementService.filterByAccountType(list, accountTypeFilter);
    if (statusFilter !== 'all') {
      list = list.filter((u: any) => u.status === statusFilter);
    }
    return list;
  }, [users, search, statusFilter, accountTypeFilter]);

  // Sorting
  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'createdAt') cmp = a.createdAt - b.createdAt;
      else if (sortField === 'fullName') cmp = a.fullName.localeCompare(b.fullName);
      else if (sortField === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortField === 'kycStatus') cmp = (a.verificationStatus || a.kycStatus || '').localeCompare(b.verificationStatus || b.kycStatus || '');
      else if (sortField === 'displayId') cmp = (a.displayId || '').localeCompare(b.displayId || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Build activity feed from audit log only (audit log itself is NOT displayed in profile)
  const getActivityFeed = useCallback(async (userId: string) => {
    const logs = await userManagementService.getAuditLog(userId);
    const activityIcons: Record<string, { icon: string; color: string }> = {
      'Add Main Wallet': { icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#10B981' },
      'Deduct Main Wallet': { icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#EF4444' },
      'Add SemWallet': { icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#10B981' },
      'Deduct SemWallet': { icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#EF4444' },
      'Account Banned': { icon: 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636', color: '#EF4444' },
      'Account Unbanned': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#10B981' },
      'Account Suspended': { icon: 'M12 9v2m0 4h.01', color: '#F59E0B' },
      'Account Activated': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#10B981' },
      'Force Logout': { icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1', color: '#F59E0B' },
      'Password Changed': { icon: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z', color: '#0066FF' },
      'KYC Approved': { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#10B981' },
      'KYC Rejected': { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z', color: '#EF4444' },
      'Email Verified': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#0066FF' },
      'Phone Verified': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#10B981' },
    };
    return logs.map((log: any) => {
      const key = Object.keys(activityIcons).find(k => log.action.includes(k)) || '';
      const iconData = activityIcons[key] || { icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: '#6B7280' };
      return { ...log, iconData };
    }).slice(0, 30);
  }, []);

  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const loadUserProfile = useCallback(async (user: UserData) => {
    setSelectedUser(user);
    setWalletBalances(await userManagementService.getWalletBalances(user.id));
    setActivityFeed(await getActivityFeed(user.id));
    setModalAmount('');
    setModalPassword('');
    setModalSuccess('');
    setModalError('');
  }, [getActivityFeed]);

  const refreshProfileData = useCallback(async (userId: string) => {
    setWalletBalances(await userManagementService.getWalletBalances(userId));
    setActivityFeed(await getActivityFeed(userId));
    fetchUsers();
  }, [fetchUsers, getActivityFeed]);

  const handleWalletAction = async (action: string, userId: string) => {
    const amount = parseFloat(modalAmount);
    if (isNaN(amount) || amount <= 0) { setModalError('Enter a valid amount'); return; }
    setProcessing(true);
    setModalError('');

    let success = false;
    switch (action) {
      case 'addMain': success = await userManagementService.addMainWallet(userId, amount); break;
      case 'deductMain': success = await userManagementService.deductMainWallet(userId, amount); break;
      case 'addSem': success = await userManagementService.addSemWallet(userId, amount); break;
      case 'deductSem': success = await userManagementService.deductSemWallet(userId, amount); break;
    }

    setProcessing(false);
    if (success) {
      setModalSuccess(`${action === 'addMain' || action === 'addSem' ? 'Added' : 'Deducted'} ₱${amount.toLocaleString()} successfully`);
      setConfirmAction(null);
      setModalAmount('');
      if (selectedUser?.id === userId) refreshProfileData(userId);
    } else {
      setModalError('Operation failed. Insufficient balance or user not found.');
    }
  };

  const handleAccountAction = async (action: string, userId: string) => {
    setProcessing(true);
    setModalError('');

    let success = false;
    switch (action) {
      case 'ban': success = await userManagementService.banUser(userId); break;
      case 'unban': success = await userManagementService.unbanUser(userId); break;
      case 'suspend': success = await userManagementService.suspendUser(userId); break;
      case 'activate': success = await userManagementService.activateUser(userId); break;
      case 'forceLogout': success = await userManagementService.forceLogout(userId); break;
      case 'changePassword': {
        if (!modalPassword || modalPassword.length < 6) {
          setModalError('Password must be at least 6 characters');
          setProcessing(false);
          return;
        }
        success = await userManagementService.changePassword(userId, modalPassword);
        break;
      }
      case 'convertDemo': success = await userManagementService.convertToDemo(userId); break;
      case 'convertReal': success = await userManagementService.convertToReal(userId); break;
    }

    setProcessing(false);
    if (success) {
      const actionLabel = action.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      setModalSuccess(`${actionLabel} completed successfully`);
      setConfirmAction(null);
      setModalPassword('');
      if (selectedUser?.id === userId) refreshProfileData(userId);
    } else {
      setModalError('Operation failed.');
    }
  };

  const exportCSV = () => {
    const csv = userManagementService.exportToCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle demo account creation
  const submitDemoAccount = async () => {
    setDemoFormError('');
    setDemoFormSuccess('');
    if (!demoForm.fullName.trim() || !demoForm.email.trim() || !demoForm.phone.trim() || !demoForm.password) {
      setDemoFormError('Full name, email, mobile number and password are required.');
      return;
    }
    setDemoSubmitting(true);
    const ok = await userManagementService.createDemoUser({
      fullName: demoForm.fullName.trim(),
      email: demoForm.email.trim(),
      phone: demoForm.phone.trim(),
      password: demoForm.password,
      mainBalance: parseFloat(demoForm.mainBalance) || 0,
      semBalance: parseFloat(demoForm.semBalance) || 0,
      ongoingBalance: parseFloat(demoForm.ongoingBalance) || 0,
      verificationStatus: demoForm.verificationStatus,
      invitationCode: demoForm.invitationCode.trim() || undefined,
      referrer: demoForm.referrer.trim() || undefined,
    });
    setDemoSubmitting(false);
    if (ok) {
      setDemoFormSuccess('Demo account created successfully.');
      setDemoForm({ fullName: '', email: '', phone: '', password: '', mainBalance: '0', semBalance: '0', ongoingBalance: '0', verificationStatus: 'NONE', invitationCode: '', referrer: '' });
      fetchUsers();
      window.dispatchEvent(new Event('dashboard:update'));
      setTimeout(() => setShowCreateDemo(false), 1500);
    } else {
      setDemoFormError('Failed to create demo account. Check that the email/phone is unique.');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'suspended': return '#F59E0B';
      case 'banned': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const kycColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10B981';
      case 'PENDING': return '#F59E0B';
      case 'REJECTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <div style={{ width: '200px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gap: '8px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
          User Management
          <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>
            {sorted.length} users
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Create Demo Account */}
          <button onClick={() => { setShowCreateDemo(true); setDemoFormError(''); setDemoFormSuccess(''); }} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '8px', color: '#A78BFA', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Create Demo Account
          </button>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', color: '#D1D5DB', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
          <button onClick={async () => {
            if (!window.confirm('⚠️ This will DELETE ALL registered accounts and their data. This CANNOT be undone! Continue?')) return;
            if (!window.confirm('⚠️ FINAL WARNING: All users, deposits, withdrawals, orders, transactions, referrals, and wallets will be permanently deleted. Are you absolutely sure?')) return;
            setLoading(true);
            const ok = await userManagementService.wipeAllUsers();
            setLoading(false);
            if (ok) {
              alert('All registered accounts and data have been deleted. Statistics reset.');
              fetchUsers();
              window.dispatchEvent(new Event('dashboard:update'));
            } else {
              alert('Failed to wipe users. Check server logs.');
            }
          }} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete All Users
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input ref={searchInputRef} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone, ID, referral code..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none',
        }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select value={accountTypeFilter} onChange={e => { setAccountTypeFilter(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none',
        }}>
          <option value="all">All Accounts</option>
          <option value="real">Real Accounts</option>
          <option value="demo">Demo Accounts</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Internal ID', field: 'displayId' as SortField },
                { label: 'Display ID', field: 'displayId' as SortField },
                { label: 'Full Name', field: 'fullName' as SortField },
                { label: 'Email', field: 'email' as SortField },
                { label: 'Status', field: 'status' as SortField },
                { label: 'Verification', field: 'kycStatus' as SortField },
                { label: 'Registered', field: 'createdAt' as SortField },
                { label: 'Referral Code', field: null },
                { label: 'Actions', field: null },
              ].map(col => (
                <th key={col.label} onClick={() => col.field && handleSort(col.field)}
                  style={{
                    padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
                    cursor: col.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                  {col.label} {col.field && <SortIcon field={col.field} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((u: any) => (
              <tr key={u.id} style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>
                  {u.id.slice(0, 10)}...
                </td>
                <td style={{ padding: '10px 12px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: '11px' }}>
                  {u.displayId}
                </td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>
                  {u.fullName}
                  {u.isDemo === true && (
                    <span style={{
                      marginLeft: '6px', padding: '1px 6px', borderRadius: '4px',
                      background: 'rgba(139,92,246,0.15)', color: '#A78BFA',
                      border: '1px solid rgba(139,92,246,0.3)',
                      fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                      verticalAlign: 'middle',
                    }}>
                      DEMO
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>
                  {u.email}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                    background: `${statusColor(u.status)}15`, color: statusColor(u.status),
                    border: `1px solid ${statusColor(u.status)}22`,
                  }}>
                    {u.status || 'active'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                    background: `${kycColor(u.verificationStatus || u.kycStatus)}15`, color: kycColor(u.verificationStatus || u.kycStatus),
                    border: `1px solid ${kycColor(u.verificationStatus || u.kycStatus)}22`,
                  }}>
                    {(u.verificationStatus || u.kycStatus) === 'NONE' ? 'Unverified' : (u.verificationStatus || u.kycStatus)}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>
                  {u.referrerDisplayId || u.referralCode || 'Direct Registration'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => loadUserProfile(u)} style={{
                    padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)',
                    border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}>
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                No users found.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page === 1 ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>
            Prev
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '12px' }}>
            Next
          </button>
        </div>
      )}

      {/* ==================== USER PROFILE MODAL ==================== */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '800px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}
            >
              {/* Close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                  User Profile
                </h2>
                <button onClick={() => setSelectedUser(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
              </div>

              {/* Inline success/error messages inside modal */}
              {modalSuccess && (
                <div style={{ margin: '16px 24px 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✅ {modalSuccess}</span>
                  <button onClick={() => setModalSuccess('')} style={{ color: '#10B981', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
                </div>
              )}
              {modalError && (
                <div style={{ margin: '16px 24px 0', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>❌ {modalError}</span>
                  <button onClick={() => setModalError('')} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
                </div>
              )}

              <div style={{ padding: '24px' }}>
                {/* ===== SECTION 1: USER INFORMATION ===== */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  User Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
                  {[
                    { label: 'User ID', value: selectedUser.id },
                    { label: 'Display User ID', value: selectedUser.displayId },
                    { label: 'Full Name', value: selectedUser.fullName },
                    { label: 'Email', value: selectedUser.email },
                    { label: 'Mobile Number', value: selectedUser.phone },
                    { label: 'Registration Date', value: new Date(selectedUser.createdAt).toLocaleString() },
                    { label: 'Last Login', value: new Date(selectedUser.lastLogin).toLocaleString() },
                    { label: 'Last Login IP', value: selectedUser.lastLoginIp },
                    { label: 'Device', value: selectedUser.device },
                    { label: 'Referral Code', value: selectedUser.referralCode || selectedUser.invitationCode || '—' },
                    { label: 'Referred By', value: selectedUser.referrerFullName
                      ? `${selectedUser.referrerFullName} (${selectedUser.referrerDisplayId})`
                      : selectedUser.referrerDisplayId || selectedUser.referredBy || 'Direct Registration' },
                    { label: 'Account Status',
                      value: <span style={{
                        padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: `${statusColor(selectedUser.status)}15`, color: statusColor(selectedUser.status),
                        border: `1px solid ${statusColor(selectedUser.status)}22`,
                      }}>{selectedUser.status || 'active'}</span>
                    },
                  ].map((field, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{field.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500, wordBreak: 'break-all' }}>{field.value || '-'}</div>
                    </div>
                  ))}
                </div>

                {/* ===== SECTION 2: WALLET BALANCES ===== */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Wallet Balances
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  {/* Main Wallet */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0,102,255,0.1), rgba(0,102,255,0.03))', border: '1px solid rgba(0,102,255,0.15)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: '2px' }}>Main Wallet</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#0066FF', marginBottom: '2px' }}>₱{(walletBalances?.main || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>
                      Last updated: {new Date().toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setConfirmAction({ type: 'addMain', userId: selectedUser.id })} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                        + Add Balance
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'deductMain', userId: selectedUser.id })} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                        - Deduct Balance
                      </button>
                    </div>
                  </div>
                  {/* SemWallet */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: '2px' }}>SemWallet</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#10B981', marginBottom: '2px' }}>₱{(walletBalances?.semWallet || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>
                      Last updated: {new Date().toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setConfirmAction({ type: 'addSem', userId: selectedUser.id })} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                        + Add Balance
                      </button>
                      <button onClick={() => setConfirmAction({ type: 'deductSem', userId: selectedUser.id })} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                        - Deduct Balance
                      </button>
                    </div>
                  </div>
                  {/* Ongoing Wallet */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: '2px' }}>Ongoing Wallet</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#F59E0B', marginBottom: '2px' }}>₱{(walletBalances?.ongoing || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>
                      Last updated: {new Date().toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Read-only (investment profits)</div>
                  </div>
                </div>

                {/* ===== SECTION 3: ACCOUNT MANAGEMENT ===== */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Account Management
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
                  {[
                    {
                      label: selectedUser.status === 'banned' ? 'Unban Account' : 'Ban Account',
                      action: selectedUser.status === 'banned' ? 'unban' : 'ban',
                      color: selectedUser.status === 'banned' ? '#10B981' : '#EF4444',
                    },
                    {
                      label: selectedUser.status === 'suspended' ? 'Activate Account' : 'Suspend Account',
                      action: selectedUser.status === 'suspended' ? 'activate' : 'suspend',
                      color: selectedUser.status === 'suspended' ? '#10B981' : '#F59E0B',
                    },
                    { label: 'Force Logout', action: 'forceLogout', color: '#F59E0B' },
                    { label: 'Change Password', action: 'changePassword', color: '#0066FF' },
                    ...(selectedUser.isDemo === true
                      ? [{ label: 'Convert to Real', action: 'convertReal', color: '#10B981' }]
                      : [{ label: 'Convert to Demo', action: 'convertDemo', color: '#8B5CF6' }]),
                  ].map((btn, i) => (
                    <button key={i} onClick={() => setConfirmAction({ type: btn.action, userId: selectedUser.id })}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', background: `${btn.color}12`,
                        border: `1px solid ${btn.color}22`, color: btn.color, fontSize: '11px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${btn.color}22`; e.currentTarget.style.borderColor = `${btn.color}44`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${btn.color}12`; e.currentTarget.style.borderColor = `${btn.color}22`; }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* ===== SECTION 4: ACTIVITY & NOTIFICATIONS ===== */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  Activity & Notifications
                </h3>
                <div style={{ maxHeight: '280px', overflow: 'auto', marginBottom: '28px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                  {activityFeed.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      No recent activity for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px' }}>
                      {activityFeed.map((entry: any, idx: number) => {
                        const color = entry.iconData?.color || '#6B7280';
                        const path = entry.iconData?.icon || 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z';
                        return (
                          <div key={entry.id || idx} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            padding: '8px 10px', borderRadius: '8px',
                            background: idx === 0 ? 'rgba(139,92,246,0.04)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '8px',
                              background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              border: `1px solid ${color}22`,
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d={path} />
                              </svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                                {entry.action}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '1px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                                  By: {entry.adminName}
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>·</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
                                  {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CREATE DEMO ACCOUNT MODAL ==================== */}
      <AnimatePresence>
        {showCreateDemo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowCreateDemo(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '16px', width: '520px', maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                  Create Demo Account
                </h2>
                <button onClick={() => setShowCreateDemo(false)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
              </div>

              <div style={{ padding: '24px' }}>
                {demoFormSuccess && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px' }}>
                    ✅ {demoFormSuccess}
                  </div>
                )}
                {demoFormError && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px' }}>
                    ❌ {demoFormError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { key: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'Juan Dela Cruz' },
                    { key: 'email', label: 'Email *', type: 'email', placeholder: 'demo@example.com' },
                    { key: 'phone', label: 'Mobile Number *', type: 'text', placeholder: '09171234567' },
                    { key: 'password', label: 'Password *', type: 'password', placeholder: '••••••••' },
                    { key: 'mainBalance', label: 'Main Wallet Balance', type: 'number', placeholder: '0' },
                    { key: 'semBalance', label: 'Sem Wallet Balance', type: 'number', placeholder: '0' },
                    { key: 'ongoingBalance', label: 'Ongoing Wallet Balance', type: 'number', placeholder: '0' },
                    { key: 'invitationCode', label: 'Invitation Code (optional)', type: 'text', placeholder: 'Auto-generated' },
                  ].map(field => (
                    <div key={field.key}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{field.label}</div>
                      <input type={field.type} value={(demoForm as any)[field.key]} onChange={e => setDemoForm({ ...demoForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px',
                          fontFamily: "'Inter', sans-serif", outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                  {/* Verification Status */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Verification Status</div>
                    <select value={demoForm.verificationStatus} onChange={e => setDemoForm({ ...demoForm, verificationStatus: e.target.value })} style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px',
                      fontFamily: "'Inter', sans-serif", outline: 'none', cursor: 'pointer',
                    }}>
                      <option value="NONE">Unverified</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  {/* Referrer */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Referrer (optional)</div>
                    <input type="text" value={demoForm.referrer} onChange={e => setDemoForm({ ...demoForm, referrer: e.target.value })}
                      placeholder="Invitation code, display ID, or email"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px',
                        fontFamily: "'Inter', sans-serif", outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: '#A78BFA', fontSize: '11px', marginBottom: '20px', lineHeight: 1.5 }}>
                  Demo accounts are fully functional but excluded from all production analytics, dashboards, reports, and financial KPIs.
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCreateDemo(false)} style={{
                    padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '12px',
                    fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}>
                    Cancel
                  </button>
                  <button onClick={submitDemoAccount} disabled={demoSubmitting} style={{
                    padding: '8px 20px', borderRadius: '8px', background: 'rgba(139,92,246,0.2)',
                    border: '1px solid rgba(139,92,246,0.35)', color: '#A78BFA', fontSize: '12px',
                    fontWeight: 600, cursor: demoSubmitting ? 'default' : 'pointer',
                    fontFamily: "'Inter', sans-serif", opacity: demoSubmitting ? 0.5 : 1,
                  }}>
                    {demoSubmitting ? 'Creating...' : 'Create Demo Account'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CONFIRMATION MODAL ==================== */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setConfirmAction(null)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '14px', padding: '24px', width: '380px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                {CONFIRM_ACTIONS[confirmAction.type]?.title || 'Confirm Action'}
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', lineHeight: 1.5 }}>
                {CONFIRM_ACTIONS[confirmAction.type]?.message || 'Are you sure?'}
              </p>

              {/* Amount input for wallet actions */}
              {(confirmAction.type.startsWith('add') || confirmAction.type.startsWith('deduct')) && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Amount (₱)</div>
                  <input type="number" value={modalAmount} onChange={e => setModalAmount(e.target.value)}
                    placeholder="Enter amount..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px',
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              )}

              {/* Password input for change password */}
              {confirmAction.type === 'changePassword' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>New Password (min 6 characters)</div>
                  <input type="password" value={modalPassword} onChange={e => setModalPassword(e.target.value)}
                    placeholder="Enter new password..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px',
                      fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmAction(null)} style={{
                  padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '12px',
                  fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>
                  Cancel
                </button>
                <button onClick={() => {
                  const { type, userId } = confirmAction;
                  if (type.startsWith('add') || type.startsWith('deduct')) {
                    handleWalletAction(type, userId);
                  } else if (type === 'changePassword') {
                    handleAccountAction(type, userId);
                  } else {
                    handleAccountAction(type, userId);
                  }
                }} disabled={processing} style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: (CONFIRM_ACTIONS[confirmAction.type]?.color || '#0066FF') + '22',
                  border: `1px solid ${(CONFIRM_ACTIONS[confirmAction.type]?.color || '#0066FF')}33`,
                  color: CONFIRM_ACTIONS[confirmAction.type]?.color || '#0066FF',
                  fontSize: '12px', fontWeight: 600, cursor: processing ? 'default' : 'pointer',
                  fontFamily: "'Inter', sans-serif", opacity: processing ? 0.5 : 1,
                }}>
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AdminUsers.displayName = 'AdminUsers';
