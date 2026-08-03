import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { depositService } from '../services/depositService';
import type { DepositRecord } from '../services/depositService';

type SortField = 'reference' | 'amount' | 'method' | 'status' | 'createdAt' | 'userFullName';
type SortDir = 'asc' | 'desc';

export const AdminDeposits: React.FC = React.memo(() => {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; deposit: DepositRecord } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const perPage = 20;

  const fetchDeposits = useCallback(async () => {
    const data = await depositService.getDeposits();
    setDeposits(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchDeposits, 10000);
    return () => clearInterval(interval);
  }, [fetchDeposits]);

  // Listen for dashboard update events
  useEffect(() => {
    const handler = () => fetchDeposits();
    window.addEventListener('dashboard:update', handler);
    return () => window.removeEventListener('dashboard:update', handler);
  }, [fetchDeposits]);

  // Filtering
  const filtered = useMemo(() => {
    let list = depositService.searchDeposits(search, deposits);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (methodFilter !== 'all') list = list.filter(d => d.method === methodFilter);
    return list;
  }, [deposits, search, statusFilter, methodFilter]);

  // Sorting
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

  // Pagination
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleApprove = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    setModalError('');
    const success = await depositService.approveDeposit(confirmAction.deposit.id);
    setProcessing(false);
    if (success) {
      setModalSuccess(`Deposit of ₱${confirmAction.deposit.amount.toLocaleString()} approved successfully`);
      setConfirmAction(null);
      fetchDeposits();
      if (selectedDeposit?.id === confirmAction.deposit.id) {
        const all = await depositService.getDeposits();
        const updated = all.find(d => d.id === confirmAction.deposit.id);
        if (updated) setSelectedDeposit(updated);
      }
    } else {
      setModalError('Failed to approve deposit');
    }
  };

  const handleReject = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    setModalError('');
    const success = await depositService.rejectDeposit(confirmAction.deposit.id, rejectReason);
    setProcessing(false);
    if (success) {
      setModalSuccess(`Deposit rejected`);
      setConfirmAction(null);
      setRejectReason('');
      fetchDeposits();
      if (selectedDeposit?.id === confirmAction.deposit.id) {
        const all = await depositService.getDeposits();
        const updated = all.find(d => d.id === confirmAction.deposit.id);
        if (updated) setSelectedDeposit(updated);
      }
    } else {
      setModalError('Failed to reject deposit');
    }
  };

  const exportCSV = () => {
    const csv = depositService.exportToCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deposits_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const methods = useMemo(() => {
    const m = new Set(deposits.map(d => d.method));
    return ['all', ...Array.from(m)];
  }, [deposits]);

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
          Deposit Management
          <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>
            {sorted.length} deposits
          </span>
        </h1>
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
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by reference, name, email, amount..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none',
        }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px',
          fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none',
        }}>
          <option value="all">All Methods</option>
          {methods.filter(m => m !== 'all').map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Success/Error Messages */}
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
                { label: 'Status', field: 'status' as SortField },
                { label: 'Date', field: 'createdAt' as SortField },
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
            {paginated.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>
                  {d.id.slice(0, 10)}...
                </td>
                <td style={{ padding: '10px 12px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: '11px' }}>
                  {d.reference}
                </td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>
                  {d.userFullName || d.user?.fullName || 'N/A'}
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>
                  {d.method}
                </td>
                <td style={{ padding: '10px 12px', color: '#E5E7EB', fontWeight: 600 }}>
                  ₱{d.amount.toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                    background: `${statusColor(d.status)}15`, color: statusColor(d.status),
                    border: `1px solid ${statusColor(d.status)}22`,
                  }}>
                    {d.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {new Date(d.createdAt).toLocaleDateString()} {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => { setSelectedDeposit(d); setModalSuccess(''); setModalError(''); }}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)',
                      border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                No deposits found.
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

      {/* ==================== DEPOSIT DETAILS MODAL ==================== */}
      <AnimatePresence>
        {selectedDeposit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
            onClick={() => setSelectedDeposit(null)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}
            >
              {/* Close */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                  Deposit Details
                </h2>
                <button onClick={() => setSelectedDeposit(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
              </div>

              <div style={{ padding: '24px' }}>
                {/* Transaction Information */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  Transaction Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'Transaction ID', value: selectedDeposit.id },
                    { label: 'Reference Number', value: selectedDeposit.reference },
                    { label: 'User ID', value: selectedDeposit.userId },
                    { label: 'Full Name', value: selectedDeposit.userFullName || selectedDeposit.user?.fullName || '-' },
                    { label: 'Email', value: selectedDeposit.userEmail || selectedDeposit.user?.email || '-' },
                    { label: 'Mobile Number', value: selectedDeposit.userPhone || '-' },
                  ].map((field, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{field.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500, wordBreak: 'break-all' }}>{field.value || '-'}</div>
                    </div>
                  ))}
                </div>

                {/* Deposit Information */}
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Deposit Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                  {[
                    { label: 'Payment Method', value: selectedDeposit.method },
                    { label: 'Deposit Amount', value: `₱${selectedDeposit.amount.toLocaleString()}` },
                    { label: 'Submitted Date', value: new Date(selectedDeposit.createdAt).toLocaleString() },
                    { label: 'Deposit Status',
                      value: <span style={{
                        padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: `${statusColor(selectedDeposit.status)}15`, color: statusColor(selectedDeposit.status),
                        border: `1px solid ${statusColor(selectedDeposit.status)}22`,
                      }}>{selectedDeposit.status}</span>
                    },
                    { label: 'Completed Date', value: selectedDeposit.completedAt ? new Date(selectedDeposit.completedAt).toLocaleString() : '-' },
                    { label: 'Approved By', value: selectedDeposit.approvedBy || '-' },
                    { label: 'Rejection Reason', value: selectedDeposit.rejectionReason || '-' },
                    { label: 'Bonus Applied', value: selectedDeposit.bonusApplied > 0 ? `₱${selectedDeposit.bonusApplied.toLocaleString()} (${selectedDeposit.bonusType})` : 'None' },
                  ].map((field, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{field.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{field.value || '-'}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {selectedDeposit.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    <button onClick={() => setConfirmAction({ type: 'reject', deposit: selectedDeposit })}
                      style={{
                        padding: '8px 20px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      }}>
                      Reject Deposit
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'approve', deposit: selectedDeposit })}
                      style={{
                        padding: '8px 20px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)',
                        border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                      }}>
                      Approve Deposit
                    </button>
                  </div>
                )}
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
              style={{ background: '#1A2235', borderRadius: '14px', padding: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
                {confirmAction.type === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Amount</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>₱{confirmAction.deposit.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>User</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>{confirmAction.deposit.userFullName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Method</span>
                  <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{confirmAction.deposit.method}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Reference</span>
                  <span style={{ fontSize: '11px', color: '#D1D5DB', fontFamily: 'monospace' }}>{confirmAction.deposit.reference}</span>
                </div>
              </div>

              {confirmAction.type === 'approve' && (
                <p style={{ fontSize: '12px', color: 'rgba(16,185,129,0.7)', marginBottom: '16px', padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)' }}>
                  This will credit the user's Main Wallet and apply any eligible deposit bonus.
                </p>
              )}

              {confirmAction.type === 'reject' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Rejection Reason (optional)</div>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px',
                      fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical',
                    }}
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
                <button onClick={confirmAction.type === 'approve' ? handleApprove : handleReject}
                  disabled={processing}
                  style={{
                    padding: '8px 16px', borderRadius: '8px',
                    background: confirmAction.type === 'approve' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    border: `1px solid ${confirmAction.type === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: confirmAction.type === 'approve' ? '#10B981' : '#EF4444',
                    fontSize: '12px', fontWeight: 600, cursor: processing ? 'default' : 'pointer',
                    fontFamily: "'Inter', sans-serif", opacity: processing ? 0.5 : 1,
                  }}>
                  {processing ? 'Processing...' : confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AdminDeposits.displayName = 'AdminDeposits';