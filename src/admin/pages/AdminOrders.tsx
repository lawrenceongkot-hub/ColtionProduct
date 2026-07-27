import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { orderManagementService } from '../services/orderManagementService';
import type { OrderRecord } from '../services/orderManagementService';

type SortField = 'vipLevel' | 'buyAmount' | 'status' | 'purchaseDate' | 'userFullName' | 'duration' | 'progressPercent';
type SortDir = 'asc' | 'desc';

export const AdminOrders: React.FC = React.memo(() => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vipFilter, setVipFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; order: OrderRecord } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [profitHistory, setProfitHistory] = useState<any[]>([]);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const perPage = 20;

  const fetchData = useCallback(() => {
    const data = orderManagementService.getOrders();
    setOrders(data);
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
    let list = orderManagementService.searchOrders(search, orders);
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (vipFilter !== 'all') list = list.filter(o => o.vipLevel === parseInt(vipFilter));
    return list;
  }, [orders, search, statusFilter, vipFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'purchaseDate') cmp = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      else if (sortField === 'buyAmount') cmp = a.buyAmount - b.buyAmount;
      else if (sortField === 'vipLevel') cmp = a.vipLevel - b.vipLevel;
      else if (sortField === 'duration') cmp = a.duration - b.duration;
      else if (sortField === 'progressPercent') cmp = a.progressPercent - b.progressPercent;
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

  const openDetails = (order: OrderRecord) => {
    setSelectedOrder(order);
    setWalletInfo(orderManagementService.getWalletInfo(order.userId));
    setProfitHistory(orderManagementService.getProfitHistory(order.id));
    setModalSuccess(''); setModalError(''); setCancelReason('');
  };

  const refreshAfterAction = () => {
    fetchData();
    if (selectedOrder) {
      const updated = orderManagementService.getOrders().find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
        setProfitHistory(orderManagementService.getProfitHistory(updated.id));
        setWalletInfo(orderManagementService.getWalletInfo(updated.userId));
      }
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, order } = confirmAction;
    setProcessing(true); setModalError('');

    let result: any = { success: false };
    switch (type) {
      case 'pause': result = orderManagementService.pauseOrder(order.id); break;
      case 'resume': result = orderManagementService.resumeOrder(order.id); break;
      case 'cancel': result = orderManagementService.cancelOrder(order.id, cancelReason || undefined); break;
      case 'complete': result = orderManagementService.completeOrder(order.id); break;
      case 'creditProfit': result = orderManagementService.manualCreditProfit(order.id); break;
    }

    setProcessing(false);
    if (result.success) {
      setModalSuccess(`${type === 'creditProfit' ? 'Profit credited' : 'Order ' + type + 'd'} successfully`);
      setConfirmAction(null);
      refreshAfterAction();
    } else {
      setModalError(result.error || `Failed to ${type} order`);
    }
  };

  const exportCSV = () => {
    const csv = orderManagementService.exportToCSV(sorted);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>{sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'completed': return '#0066FF';
      case 'cancelled': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const vipLevels = useMemo(() => [...new Set(orders.map(o => o.vipLevel))].sort(), [orders]);

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
          Order Management <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>{sorted.length} orders</span>
        </h1>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#D1D5DB', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, order ID, VIP..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={vipFilter} onChange={e => { setVipFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All VIP Levels</option>
          {vipLevels.map(l => <option key={l} value={l}>VIP {l}</option>)}
        </select>
      </div>

      {modalSuccess && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}><span>✅ {modalSuccess}</span><button onClick={() => setModalSuccess('')} style={{ color: '#10B981', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button></div>}
      {modalError && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}><span>❌ {modalError}</span><button onClick={() => setModalError('')} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button></div>}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ label: 'Order ID', field: null }, { label: 'User', field: 'userFullName' as SortField }, { label: 'VIP', field: 'vipLevel' as SortField }, { label: 'Amount', field: 'buyAmount' as SortField }, { label: 'Duration', field: 'duration' as SortField }, { label: 'Daily Profit', field: null }, { label: 'Progress', field: 'progressPercent' as SortField }, { label: 'Status', field: 'status' as SortField }, { label: 'Date', field: 'purchaseDate' as SortField }, { label: 'Actions', field: null }].map(col => (
              <th key={col.label} onClick={() => col.field && handleSort(col.field)} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: col.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>{col.label} {col.field && <SortIcon field={col.field} />}</th>
            ))}</tr></thead>
          <tbody>
            {paginated.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px' }}>{o.id.slice(0, 10)}...</td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>{o.userFullName}</td>
                <td style={{ padding: '10px 12px', color: '#F59E0B', fontWeight: 600 }}>VIP {o.vipLevel}</td>
                <td style={{ padding: '10px 12px', color: '#E5E7EB', fontWeight: 600 }}>₱{o.buyAmount.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{o.duration}d</td>
                <td style={{ padding: '10px 12px', color: '#10B981' }}>₱{o.dailyProfitPerDay.toLocaleString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', minWidth: '60px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${o.progressPercent}%`, background: o.status === 'completed' ? '#0066FF' : '#10B981', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{o.progressPercent}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(o.status)}15`, color: statusColor(o.status), border: `1px solid ${statusColor(o.status)}22` }}>{o.status}</span></td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(o.purchaseDate).toLocaleDateString()}</td>
                <td style={{ padding: '10px 12px' }}><button onClick={() => openDetails(o)} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>View</button></td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No orders found.</td></tr>}
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
        {selectedOrder && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
          onClick={() => setSelectedOrder(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '800px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* User Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> User Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[{ label: 'User ID', value: selectedOrder.userId }, { label: 'Full Name', value: selectedOrder.userFullName }, { label: 'Email', value: selectedOrder.userEmail }, { label: 'Mobile', value: selectedOrder.userPhone }].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* VIP Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> VIP Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[{ label: 'VIP Plan', value: selectedOrder.vipName }, { label: 'VIP Level', value: `VIP ${selectedOrder.vipLevel}` }, { label: 'Duration', value: `${selectedOrder.duration} days` },
                  { label: 'Daily ROI', value: `${selectedOrder.dailyRate}%` }, { label: 'Total Expected Return', value: `₱${selectedOrder.totalReturn.toLocaleString()}` }, { label: 'Purchase Date', value: new Date(selectedOrder.purchaseDate).toLocaleDateString() },
                  { label: 'Expiration', value: new Date(new Date(selectedOrder.purchaseDate).getTime() + selectedOrder.duration * 86400000).toLocaleDateString() }].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Investment Progress */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> Investment Progress
              </h3>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${selectedOrder.progressPercent}%`, background: 'linear-gradient(90deg, #10B981, #34D399)', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[{ label: 'Order Amount', value: `₱${selectedOrder.buyAmount.toLocaleString()}` }, { label: 'Daily Profit', value: `₱${selectedOrder.dailyProfitPerDay.toLocaleString()}` },
                    { label: 'Total Profit Earned', value: `₱${selectedOrder.currentProfit.toLocaleString()}` }, { label: 'Remaining Profit', value: `₱${Math.max(0, selectedOrder.totalReturn - selectedOrder.currentProfit).toLocaleString()}` },
                    { label: 'Days Completed', value: `${selectedOrder.completedDays} / ${selectedOrder.duration}` }, { label: 'Days Remaining', value: selectedOrder.daysRemaining.toString() },
                    { label: 'Progress', value: `${selectedOrder.progressPercent}%` }, { label: 'Status', value: <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(selectedOrder.status)}15`, color: statusColor(selectedOrder.status) }}>{selectedOrder.status}</span> }].map((f, i) => (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                      <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallet Info */}
              {walletInfo && <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Wallet Balances</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.15)' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Main Wallet</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#0066FF' }}>₱{walletInfo.main.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>SemWallet</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>₱{walletInfo.semWallet.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Ongoing Wallet</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#F59E0B' }}>₱{walletInfo.ongoing.toLocaleString()}</div>
                  </div>
                </div>
              </div>}

              {/* Profit History */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Profit History</h3>
              <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                {profitHistory.length === 0 ? <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No profit history yet.</div> :
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px' }}>Profit</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px' }}>Wallet</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '10px' }}>Status</th>
                    </tr></thead>
                    <tbody>{profitHistory.slice(0, 25).map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{new Date(p.date).toLocaleDateString()}</td>
                        <td style={{ padding: '7px 10px', color: '#10B981', fontWeight: 600, fontSize: '10px' }}>₱{p.amount.toLocaleString()}</td>
                        <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{p.walletCredited}</td>
                        <td style={{ padding: '7px 10px', fontSize: '10px' }}><span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>{p.status}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', justifyContent: 'flex-end' }}>
                {(selectedOrder.status === 'active' || selectedOrder.status === 'paused') && (
                  <>
                    {selectedOrder.status === 'active' && <button onClick={() => setConfirmAction({ type: 'pause', order: selectedOrder })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Pause</button>}
                    {selectedOrder.status === 'paused' && <button onClick={() => setConfirmAction({ type: 'resume', order: selectedOrder })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Resume</button>}
                    <button onClick={() => setConfirmAction({ type: 'complete', order: selectedOrder })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Complete</button>
                    <button onClick={() => setConfirmAction({ type: 'cancel', order: selectedOrder })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    {selectedOrder.status === 'active' && <button onClick={() => setConfirmAction({ type: 'creditProfit', order: selectedOrder })} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Credit Profit (Super Admin)</button>}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmAction && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmAction(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()} style={{ background: '#1A2235', borderRadius: '14px', padding: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>{confirmAction.type === 'pause' ? 'Pause Investment' : confirmAction.type === 'resume' ? 'Resume Investment' : confirmAction.type === 'cancel' ? 'Cancel Investment' : confirmAction.type === 'complete' ? 'Complete Investment' : 'Credit Daily Profit'}</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>VIP Plan</span><span style={{ fontSize: '12px', fontWeight: 600, color: '#F59E0B' }}>VIP {confirmAction.order.vipLevel} - {confirmAction.order.vipName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>User</span><span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>{confirmAction.order.userFullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Amount</span><span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>₱{confirmAction.order.buyAmount.toLocaleString()}</span>
              </div>
            </div>
            {confirmAction.type === 'cancel' && <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Cancellation Reason</div>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Enter reason..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical' }} />
            </div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              <button onClick={handleAction} disabled={processing} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(0,102,255,0.2)', border: '1px solid rgba(0,102,255,0.3)', color: '#0066FF', fontSize: '12px', fontWeight: 600, cursor: processing ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: processing ? 0.5 : 1 }}>
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
});

AdminOrders.displayName = 'AdminOrders';