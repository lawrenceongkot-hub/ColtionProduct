import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

type SortField = 'type' | 'amount' | 'status' | 'createdAt' | 'reference';
type SortDir = 'asc' | 'desc';

const TX_TYPES: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  VIP_PURCHASE: 'VIP Purchase',
  DAILY_PROFIT: 'Daily Profit',
  REFERRAL_COMMISSION: 'Referral Commission',
  WELCOME_BONUS: 'Welcome Bonus',
  WALLET_TRANSFER: 'Wallet Transfer',
  VIP_MATURITY_TRANSFER: 'VIP Maturity Transfer',
  AGENT_COMMISSION: 'Agent Commission',
};

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: '#0066FF',
  WITHDRAWAL: '#EF4444',
  VIP_PURCHASE: '#F59E0B',
  DAILY_PROFIT: '#10B981',
  REFERRAL_COMMISSION: '#8B5CF6',
  WELCOME_BONUS: '#EC4899',
  WALLET_TRANSFER: '#06B6D4',
  VIP_MATURITY_TRANSFER: '#14B8A6',
  AGENT_COMMISSION: '#F97316',
};

export const AdminTransactions: React.FC = React.memo(() => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const fetchData = useCallback(async () => {
    try {
      const data = await adminApi.getTransactions();
      setTransactions(data);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = transactions
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => statusFilter === 'all' || t.status === statusFilter)
    .filter(t => !search ||
      t.reference?.toLowerCase().includes(search.toLowerCase()) ||
      t.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      t.user?.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'amount') return (a.amount - b.amount) * dir;
      if (sortField === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      return aVal.localeCompare(bVal) * dir;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' },
    title: { fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" },
    searchInput: { padding: '8px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', width: '220px' } as React.CSSProperties,
    select: { padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', cursor: 'pointer' } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', cursor: 'pointer' },
    td: { padding: '10px 12px', fontSize: '13px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.04)' },
    badge: (color: string) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif", background: `${color}15`, color, border: `1px solid ${color}30` }),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Transactions</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input style={styles.searchInput} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <select style={styles.select} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            {Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select style={styles.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(17,24,39,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} onClick={() => toggleSort('createdAt')}>Date {sortField === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={styles.th}>User</th>
                <th style={styles.th} onClick={() => toggleSort('type')}>Type {sortField === 'type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={styles.th} onClick={() => toggleSort('amount')}>Amount {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th} onClick={() => toggleSort('reference')}>Reference {sortField === 'reference' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={styles.th} onClick={() => toggleSort('status')}>Status {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(tx => (
                <tr key={tx.id}>
                  <td style={styles.td}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}>{tx.user?.fullName || tx.user?.email || 'N/A'}</td>
                  <td style={styles.td}>
                    <span style={{ color: TYPE_COLORS[tx.type] || '#FFFFFF', fontWeight: 500 }}>
                      {TX_TYPES[tx.type] || tx.type}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>₱{tx.amount.toLocaleString()}</td>
                  <td style={styles.td}>{tx.method || '—'}</td>
                  <td style={{ ...styles.td, fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{tx.reference}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(tx.status === 'SUCCESS' ? '#10B981' : tx.status === 'PENDING' ? '#F59E0B' : '#EF4444')}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: page === i + 1 ? 'rgba(0,102,255,0.2)' : 'rgba(255,255,255,0.05)',
              color: page === i + 1 ? '#0066FF' : 'rgba(255,255,255,0.5)',
              fontSize: '12px', fontWeight: page === i + 1 ? 600 : 400, fontFamily: "'Inter', sans-serif",
            }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

AdminTransactions.displayName = 'AdminTransactions';