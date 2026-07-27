import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SortField = 'type' | 'amount' | 'method' | 'status' | 'createdAt' | 'reference';
type SortDir = 'asc' | 'desc';

interface TxRecord {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  type: string;
  amount: number;
  method: string;
  reference: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  walletAffected: string;
  balanceBefore: number;
  balanceAfter: number;
  approvedBy: string | null;
  rejectionReason: string | null;
  notes: string | null;
  relatedOrderId: string | null;
  relatedDepositId: string | null;
  relatedWithdrawalId: string | null;
}

const TX_TYPES: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  vip_purchase: 'VIP Purchase',
  daily_profit: 'Daily Profit',
  referral_commission: 'Referral Commission',
  welcome_bonus: 'Welcome Bonus',
  wallet_transfer: 'Wallet Transfer',
  vip_maturity_transfer: 'VIP Maturity Transfer',
  agent_commission: 'Agent Commission',
};

const TYPE_COLORS: Record<string, string> = {
  deposit: '#0066FF',
  withdrawal: '#EF4444',
  vip_purchase: '#F59E0B',
  daily_profit: '#10B981',
  referral_commission: '#8B5CF6',
  welcome_bonus: '#EC4899',
  wallet_transfer: '#06B6D4',
  vip_maturity_transfer: '#14B8A6',
  agent_commission: '#F97316',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#8B5CF6',
  success: '#10B981',
  completed: '#10B981',
  failed: '#EF4444',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

function getWalletAffected(type: string): string {
  switch (type) {
    case 'deposit': return 'Main Wallet';
    case 'withdrawal': return 'Main Wallet';
    case 'vip_purchase': return 'Main Wallet';
    case 'daily_profit': return 'Ongoing Wallet';
    case 'referral_commission': return 'SemWallet';
    case 'welcome_bonus': return 'SemWallet';
    case 'wallet_transfer': return 'Main Wallet / SemWallet';
    case 'vip_maturity_transfer': return 'Main Wallet';
    case 'agent_commission': return 'SemWallet';
    default: return 'Main Wallet';
  }
}

export const AdminTransactions: React.FC = React.memo(() => {
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<TxRecord | null>(null);
  const perPage = 25;

  const fetchData = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('coltion_transactions') || '[]');
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      const records: TxRecord[] = raw.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((t: any) => {
        const user = users.find((u: any) => u.id === t.userId);
        return {
          id: t.id,
          userId: t.userId,
          userFullName: user?.fullName || 'Unknown',
          userEmail: user?.email || '-',
          userPhone: user?.phone || '-',
          type: t.type,
          amount: t.amount || 0,
          method: t.method || '-',
          reference: t.reference || '-',
          status: t.status === 'success' ? 'completed' : t.status === 'failed' ? 'rejected' : t.status,
          createdAt: t.createdAt,
          completedAt: t.completedAt || null,
          walletAffected: getWalletAffected(t.type),
          balanceBefore: t.balanceBefore || 0,
          balanceAfter: t.balanceAfter || 0,
          approvedBy: t.approvedBy || null,
          rejectionReason: t.rejectionReason || null,
          notes: t.notes || null,
          relatedOrderId: t.type === 'vip_purchase' || t.type === 'daily_profit' || t.type === 'vip_maturity_transfer' ? t.id : null,
          relatedDepositId: t.type === 'deposit' ? t.id : null,
          relatedWithdrawalId: t.type === 'withdrawal' ? t.id : null,
        };
      });
      setTxs(records);
      setLoading(false);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);
  useEffect(() => {
    const h = () => fetchData();
    window.addEventListener('dashboard:update', h);
    return () => window.removeEventListener('dashboard:update', h);
  }, [fetchData]);

  const filtered = useMemo(() => {
    let list = txs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.id.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q) || t.userFullName.toLowerCase().includes(q) || t.userEmail.toLowerCase().includes(q) || t.userPhone.includes(q) || t.userId.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    return list;
  }, [txs, search, typeFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortField === 'method') cmp = a.method.localeCompare(b.method);
      else if (sortField === 'reference') cmp = a.reference.localeCompare(b.reference);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'User ID', 'Full Name', 'Email', 'Phone', 'Method', 'Amount', 'Reference', 'Status', 'Created', 'Completed', 'Wallet', 'Balance Before', 'Balance After', 'Approved By', 'Rejection Reason', 'Notes'];
    const rows = sorted.map(t => [t.id, t.type, t.userId, t.userFullName, t.userEmail, t.userPhone, t.method, t.amount, t.reference, t.status, t.createdAt, t.completedAt || '', t.walletAffected, t.balanceBefore, t.balanceAfter, t.approvedBy || '', t.rejectionReason || '', t.notes || ''].join(','));
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>{sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  if (loading) {
    return <div style={{ padding: '20px 24px' }}>
      <div style={{ width: '200px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '20px' }} />
      <div style={{ display: 'grid', gap: '8px' }}>{Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />)}</div>
    </div>;
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
          Transaction Management <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>{sorted.length} transactions</span>
        </h1>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#D1D5DB', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by ID, name, email, reference..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Types</option>
          {Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ label: 'Transaction ID', field: 'reference' as SortField }, { label: 'Type', field: 'type' as SortField }, { label: 'User', field: null }, { label: 'Method', field: 'method' as SortField }, { label: 'Amount', field: 'amount' as SortField }, { label: 'Reference', field: 'reference' as SortField }, { label: 'Status', field: 'status' as SortField }, { label: 'Date', field: 'createdAt' as SortField }, { label: 'Actions', field: null }].map(col => (
              <th key={col.label} onClick={() => col.field && handleSort(col.field)} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: col.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>{col.label} {col.field && <SortIcon field={col.field} />}</th>
            ))}</tr></thead>
          <tbody>
            {paginated.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>{t.id.slice(0, 10)}...</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${(TYPE_COLORS[t.type] || '#6B7280')}15`, color: TYPE_COLORS[t.type] || '#6B7280', border: `1px solid ${(TYPE_COLORS[t.type] || '#6B7280')}22` }}>
                    {TX_TYPES[t.type] || t.type}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>{t.userFullName}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{t.method}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: t.amount >= 0 ? '#10B981' : '#EF4444' }}>{t.amount >= 0 ? '+' : '-'}₱{Math.abs(t.amount).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '10px' }}>{t.reference}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${(STATUS_COLORS[t.status] || '#6B7280')}15`, color: STATUS_COLORS[t.status] || '#6B7280', border: `1px solid ${(STATUS_COLORS[t.status] || '#6B7280')}22` }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => setSelectedTx(t)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>View</button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page === 1 ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page === 1 ? 'default' : 'pointer', fontSize: '12px' }}>Prev</button>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : '#D1D5DB', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '12px' }}>Next</button>
      </div>}

      {/* DETAILS MODAL */}
      <AnimatePresence>
        {selectedTx && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
          onClick={() => setSelectedTx(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>Transaction Details</h2>
              <button onClick={() => setSelectedTx(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Transaction Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Transaction Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Transaction ID', value: selectedTx.id },
                  { label: 'Reference Number', value: selectedTx.reference },
                  { label: 'Transaction Type', value: <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${(TYPE_COLORS[selectedTx.type] || '#6B7280')}15`, color: TYPE_COLORS[selectedTx.type] || '#6B7280' }}>{TX_TYPES[selectedTx.type] || selectedTx.type}</span> },
                  { label: 'Status', value: <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${(STATUS_COLORS[selectedTx.status] || '#6B7280')}15`, color: STATUS_COLORS[selectedTx.status] || '#6B7280' }}>{selectedTx.status}</span> },
                  { label: 'Amount', value: <span style={{ fontWeight: 700, color: selectedTx.amount >= 0 ? '#10B981' : '#EF4444' }}>{selectedTx.amount >= 0 ? '+' : '-'}₱{Math.abs(selectedTx.amount).toLocaleString()}</span> },
                  { label: 'Payment Method', value: selectedTx.method },
                  { label: 'Created Date', value: new Date(selectedTx.createdAt).toLocaleString() },
                  { label: 'Updated Date', value: selectedTx.completedAt ? new Date(selectedTx.completedAt).toLocaleString() : '-' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* User Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>User Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[{ label: 'User ID', value: selectedTx.userId }, { label: 'Full Name', value: selectedTx.userFullName }, { label: 'Email', value: selectedTx.userEmail }, { label: 'Mobile Number', value: selectedTx.userPhone }].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Wallet Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Wallet Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.15)' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Wallet Affected</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0066FF' }}>{selectedTx.walletAffected}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Balance Before</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>₱{selectedTx.balanceBefore.toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Balance After</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }}>₱{selectedTx.balanceAfter.toLocaleString()}</div>
                </div>
              </div>

              {/* Admin Info */}
              {selectedTx.approvedBy && <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Administrator Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>Processed By</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{selectedTx.approvedBy}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>Processed Date</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{selectedTx.completedAt ? new Date(selectedTx.completedAt).toLocaleString() : '-'}</div>
                  </div>
                </div>
              </div>}

              {/* Additional Info */}
              {(selectedTx.rejectionReason || selectedTx.notes || selectedTx.relatedOrderId) && <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Additional Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {selectedTx.rejectionReason && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>Rejection Reason</div>
                    <div style={{ fontSize: '12px', color: '#EF4444' }}>{selectedTx.rejectionReason}</div>
                  </div>}
                  {selectedTx.notes && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>Notes</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB' }}>{selectedTx.notes}</div>
                  </div>}
                </div>
              </div>}
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
});

AdminTransactions.displayName = 'AdminTransactions';