import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { withdrawalService } from '../services/withdrawalService';
import type { WithdrawalRecord } from '../services/withdrawalService';

type SortField = 'reference' | 'amount' | 'method' | 'status' | 'createdAt' | 'userFullName';
type SortDir = 'asc' | 'desc';

export const AdminWithdrawals: React.FC = React.memo(() => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedW, setSelectedW] = useState<WithdrawalRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; withdrawal: WithdrawalRecord } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [notes, setNotes] = useState('');
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    const data = await withdrawalService.getWithdrawals();
    setWithdrawals(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);
  useEffect(() => {
    const h = () => fetchData();
    window.addEventListener('dashboard:update', h);
    return () => window.removeEventListener('dashboard:update', h);
  }, [fetchData]);

  const filtered = useMemo(() => {
    let list = withdrawalService.searchWithdrawals(search, withdrawals);
    if (statusFilter !== 'all') list = list.filter(w => w.status === statusFilter);
    if (methodFilter !== 'all') list = list.filter(w => w.method === methodFilter);
    return list;
  }, [withdrawals, search, statusFilter, methodFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'reference') cmp = a.reference.localeCompare(b.reference);
      else if (sortField === 'method') cmp = a.method.localeCompare(b.method);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'userFullName') cmp = a.userFullName.localeCompare(b.userFullName);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openDetails = async (w: WithdrawalRecord) => {
    setSelectedW(w);
    setWalletInfo(await withdrawalService.getWalletInfo(w.userId));
    setModalSuccess(''); setModalError('');
    setRejectReason(''); setPaymentRef(''); setTransferRef(''); setNotes('');
  };

  const refreshAfterAction = async (withdrawalId: string) => {
    await fetchData();
    if (selectedW?.id === withdrawalId) {
      const all = await withdrawalService.getWithdrawals();
      const updated = all.find(w => w.id === withdrawalId);
      if (updated) { setSelectedW(updated); setWalletInfo(await withdrawalService.getWalletInfo(updated.userId)); }
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, withdrawal } = confirmAction;
    setProcessing(true); setModalError('');

    let success = false;
    switch (type) {
      case 'approve': success = await withdrawalService.approveWithdrawal(withdrawal.id); break;
      case 'process': success = await withdrawalService.processWithdrawal(withdrawal.id, notes || undefined); break;
      case 'complete': success = await withdrawalService.completeWithdrawal(withdrawal.id, paymentRef || undefined, transferRef || undefined, notes || undefined); break;
      case 'reject': success = await withdrawalService.rejectWithdrawal(withdrawal.id, rejectReason || undefined); break;
    }

    setProcessing(false);
    if (success) {
      setModalSuccess(`Withdrawal ${type}d successfully`);
      setConfirmAction(null);
      refreshAfterAction(withdrawal.id);
    } else {
      setModalError(`Failed to ${type} withdrawal`);
    }
  };

  const exportCSV = () => {
    const csv = withdrawalService.exportToCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `withdrawals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#0066FF';
      case 'processing': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const methods = useMemo(() => {
    const m = new Set(withdrawals.map(w => w.method));
    return ['all', ...Array.from(m)];
  }, [withdrawals]);

  const confirmConfig: Record<string, { title: string; color: string }> = {
    approve: { title: 'Approve Withdrawal', color: '#0066FF' },
    process: { title: 'Mark as Processing', color: '#8B5CF6' },
    complete: { title: 'Mark as Completed', color: '#10B981' },
    reject: { title: 'Reject Withdrawal', color: '#EF4444' },
  };

  if (loading) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <div style={{ width: '200px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gap: '8px' }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
          Withdrawal Management
          <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>
            {sorted.length} withdrawals
          </span>
        </h1>
        <button onClick={exportCSV} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', color: '#D1D5DB', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by reference, name, email, amount..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Methods</option>
          {methods.filter(m => m !== 'all').map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {modalSuccess && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>✅ {modalSuccess}</span>
          <button onClick={() => setModalSuccess('')} style={{ color: '#10B981', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
        </div>
      )}
      {modalError && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>❌ {modalError}</span>
          <button onClick={() => setModalError('')} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Transaction ID', field: 'reference' as SortField },
                { label: 'Reference', field: 'reference' as SortField },
                { label: 'User', field: 'userFullName' as SortField },
                { label: 'Method', field: 'method' as SortField },
                { label: 'Amount', field: 'amount' as SortField },
                { label: 'Fee', field: 'amount' as SortField },
                { label: 'Net', field: 'amount' as SortField },
                { label: 'Status', field: 'status' as SortField },
                { label: 'Date', field: 'createdAt' as SortField },
                { label: 'Account', field: null },
                { label: 'Actions', field: null },
              ].map(col => (
                <th key={col.label} onClick={() => col.field && handleSort(col.field)}
                  style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: col.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  {col.label} {col.field && <SortIcon field={col.field} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((w) => (
              <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>{w.id.slice(0, 10)}...</td>
                <td style={{ padding: '10px 12px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: '11px' }}>{w.reference}</td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>{w.userFullName || w.user?.fullName || 'N/A'}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{w.method}</td>
                <td style={{ padding: '10px 12px', color: '#E5E7EB', fontWeight: 600 }}>₱{w.amount.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: '#EF4444', fontWeight: 500 }}>₱{(w.fee || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: '#10B981', fontWeight: 600 }}>₱{(w.netAmount || w.amount || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(w.status)}15`, color: statusColor(w.status), border: `1px solid ${statusColor(w.status)}22` }}>
                    {w.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {new Date(w.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.accountNumber || w.walletNumber || '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => openDetails(w)}
                    style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No withdrawals found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page === 1 ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>Prev</button>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '12px' }}>Next</button>
        </div>
      )}

      {/* ==================== DETAILS MODAL ==================== */}
      <AnimatePresence>
        {selectedW && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
            onClick={() => setSelectedW(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '800px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>Withdrawal Details</h2>
                <button onClick={() => setSelectedW(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
              </div>
              <div style={{ padding: '24px' }}>
                {/* User Info */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  User Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'User ID', value: selectedW.userId },
                    { label: 'Full Name', value: selectedW.userFullName },
                    { label: 'Email', value: selectedW.userEmail },
                    { label: 'Mobile Number', value: selectedW.userPhone },
                    { label: 'Account Status', value: <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: (selectedW.userStatus || 'active') === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: (selectedW.userStatus || 'active') === 'active' ? '#10B981' : '#EF4444' }}>{selectedW.userStatus || 'Active'}</span> },
                  ].map((f, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500, wordBreak: 'break-all' }}>{f.value || '-'}</div>
                    </div>
                  ))}
                </div>

                {/* Withdrawal Info */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                  Withdrawal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'Transaction ID', value: selectedW.id },
                    { label: 'Reference Number', value: selectedW.reference },
                    { label: 'Withdrawal Method', value: selectedW.method },
                    { label: 'Account Name', value: selectedW.accountName },
                    { label: 'Account Number', value: selectedW.accountNumber },
                    { label: 'Requested Amount', value: `₱${(selectedW.amount ?? 0).toLocaleString()}` },
                    { label: 'Processing Fee (2%)', value: `₱${(selectedW.fee ?? 0).toLocaleString()}` },
                    { label: 'Net Amount to Send', value: `₱${(selectedW.netAmount ?? selectedW.amount ?? 0).toLocaleString()}` },
                    { label: 'Status', value: <span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: `${statusColor(selectedW.status)}15`, color: statusColor(selectedW.status), border: `1px solid ${statusColor(selectedW.status)}22` }}>{selectedW.status}</span> },
                    { label: 'Request Date', value: selectedW.createdAt ? new Date(selectedW.createdAt).toLocaleString() : '-' },
                    { label: 'Approved Date', value: selectedW.approvedAt ? new Date(selectedW.approvedAt).toLocaleString() : '-' },
                    { label: 'Completed Date', value: selectedW.completedAtTime ? new Date(selectedW.completedAtTime).toLocaleString() : '-' },
                    { label: 'Approved By', value: selectedW.approvedBy || '-' },
                    { label: 'Processed By', value: selectedW.processedBy || '-' },
                    { label: 'Completed By', value: selectedW.completedBy || '-' },
                    { label: 'Payment Reference', value: selectedW.paymentReference || '-' },
                    { label: 'Transfer Reference', value: selectedW.transferReference || '-' },
                    { label: 'Rejection Reason', value: selectedW.rejectionReason || '-' },
                    { label: 'Notes', value: selectedW.notes || '-' },
                  ].map((f, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                    </div>
                  ))}
                </div>

                {/* Wallet Info */}
                {walletInfo && (
                  <>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                      Wallet & Investment Info
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { label: 'Main Wallet', value: `₱${walletInfo.main.toLocaleString()}`, color: '#0066FF' },
                        { label: 'SemWallet', value: `₱${walletInfo.semWallet.toLocaleString()}`, color: '#10B981' },
                        { label: 'Ongoing Wallet', value: `₱${walletInfo.ongoing.toLocaleString()}`, color: '#F59E0B' },
                        { label: 'Total Investment', value: `₱${walletInfo.totalInvested.toLocaleString()}`, color: '#8B5CF6' },
                        { label: 'Active VIP', value: walletInfo.activeVIP, color: '#EC4899' },
                        { label: 'Remaining Days', value: walletInfo.remainingDays.toString(), color: '#06B6D4' },
                      ].map((w, i) => (
                        <div key={i} style={{ padding: '12px', borderRadius: '10px', background: `${w.color}08`, border: `1px solid ${w.color}15` }}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{w.label}</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: w.color, fontFamily: "'Inter', sans-serif" }}>{w.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  {selectedW.status === 'pending' && (
                    <>
                      <button onClick={() => setConfirmAction({ type: 'reject', withdrawal: selectedW })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                      <button onClick={() => setConfirmAction({ type: 'approve', withdrawal: selectedW })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                    </>
                  )}
                  {selectedW.status === 'approved' && (
                    <button onClick={() => setConfirmAction({ type: 'process', withdrawal: selectedW })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Mark Processing</button>
                  )}
                  {(selectedW.status === 'approved' || selectedW.status === 'processing') && (
                    <button onClick={() => setConfirmAction({ type: 'complete', withdrawal: selectedW })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Mark Completed</button>
                  )}
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
            onClick={() => setConfirmAction(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '14px', padding: '24px', width: '420px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
                {confirmConfig[confirmAction.type]?.title || 'Confirm Action'}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Amount</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>₱{(confirmAction.withdrawal.amount ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Net Amount</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>₱{(confirmAction.withdrawal.netAmount ?? confirmAction.withdrawal.amount ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>User</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>{confirmAction.withdrawal.userFullName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Account</span>
                  <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{confirmAction.withdrawal.accountNumber} ({confirmAction.withdrawal.method})</span>
                </div>
              </div>

              {confirmAction.type === 'reject' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Rejection Reason (optional)</div>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." rows={3}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical' }} />
                </div>
              )}

              {(confirmAction.type === 'process' || confirmAction.type === 'complete') && (
                <div style={{ marginBottom: '16px' }}>
                  {confirmAction.type === 'complete' && (
                    <>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Payment Reference</div>
                      <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Enter payment reference..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', marginBottom: '10px' }} />
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Transfer Reference</div>
                      <input value={transferRef} onChange={e => setTransferRef(e.target.value)} placeholder="Enter transfer reference..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', marginBottom: '10px' }} />
                    </>
                  )}
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Notes</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter notes..." rows={2}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmAction(null)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
                <button onClick={handleAction} disabled={processing}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: (confirmConfig[confirmAction.type]?.color || '#0066FF') + '22', border: `1px solid ${(confirmConfig[confirmAction.type]?.color || '#0066FF')}33`, color: confirmConfig[confirmAction.type]?.color || '#0066FF', fontSize: '12px', fontWeight: 600, cursor: processing ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: processing ? 0.5 : 1 }}>
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

AdminWithdrawals.displayName = 'AdminWithdrawals';