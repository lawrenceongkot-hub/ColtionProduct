import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VerificationRequest } from '../../types';

type SortField = 'status' | 'createdAt' | 'email' | 'mobileNumber';
type SortDir = 'asc' | 'desc';

const VERIFICATION_KEY = 'coltion_verifications';
const USERS_KEY = 'coltion_users';
const AUDIT_LOG_KEY = 'coltion_audit_log';
const NOTIFICATIONS_KEY = 'coltion_notifications';
const ADMIN_SESSION_KEY = 'coltion_admin_session';

function getItems<T>(key: string): T[] {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : []; } catch { return []; }
}
function saveItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}
function generateId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
function notifyDashboard(): void {
  try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}
}
function getAdminInfo(): { id: string; name: string; role: string } {
  try {
    const data = localStorage.getItem(ADMIN_SESSION_KEY);
    if (data) { const a = JSON.parse(data); return { id: a.id, name: a.name, role: a.role }; }
  } catch {}
  return { id: 'unknown', name: 'Unknown Admin', role: 'unknown' };
}

function addAuditLog(userId: string, verificationCode: string, action: string, before: string, after: string): void {
  const admin = getAdminInfo();
  const logs = getItems<any>(AUDIT_LOG_KEY);
  logs.unshift({
    id: generateId('aud_'), adminId: admin.id, adminName: admin.name, adminRole: admin.role,
    userId, verificationCode, action, beforeValue: before, afterValue: after,
    timestamp: new Date().toISOString(), ipAddress: '127.0.0.1',
  });
  if (logs.length > 1000) logs.length = 1000;
  saveItems(AUDIT_LOG_KEY, logs);
}

function addNotification(userId: string, type: string, message: string): void {
  const notifications = getItems<any>(NOTIFICATIONS_KEY);
  notifications.unshift({ id: generateId('notif_'), userId, type, message, read: false, createdAt: new Date().toISOString() });
  if (notifications.length > 200) notifications.length = 200;
  saveItems(NOTIFICATIONS_KEY, notifications);
  try { window.dispatchEvent(new CustomEvent('notification:new')); } catch {}
}

export const AdminVerification: React.FC = React.memo(() => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; req: any } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalError, setModalError] = useState('');
  const perPage = 20;

  const fetchData = useCallback(() => {
    const verifications = getItems<any>(VERIFICATION_KEY);
    const users = getItems<any>(USERS_KEY);
    const data = verifications
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((v: any) => {
        const user = users.find((u: any) => u.id === v.userId);
        return {
          id: v.id,
          userId: v.userId,
          fullName: user?.fullName || 'Unknown',
          email: v.email || user?.email || '-',
          phone: v.mobileNumber || user?.phone || '-',
          verificationCode: v.verificationCode || v.id?.slice(-10) || '-',
          status: v.status === 'PENDING' ? 'pending' : v.status === 'APPROVED' ? 'approved' : v.status === 'REJECTED' ? 'rejected' : 'expired',
          createdAt: v.createdAt,
          updatedAt: v.updatedAt || null,
        };
      });
    setRequests(data);
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
    let list = requests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.includes(q) || r.userId.toLowerCase().includes(q) || r.verificationCode.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    return list;
  }, [requests, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortField === 'mobileNumber') cmp = a.phone.localeCompare(b.phone);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleApprove = async () => {
    if (!confirmAction) return;
    setProcessing(true); setModalError('');
    const verifications = getItems<any>(VERIFICATION_KEY);
    const v = verifications.find((r: any) => r.id === confirmAction.req.id);
    if (!v) { setModalError('Verification request not found.'); setProcessing(false); return; }
    if (v.status !== 'PENDING') { setModalError('This request has already been processed.'); setProcessing(false); return; }
    const before = v.status;
    v.status = 'APPROVED';
    v.updatedAt = new Date().toISOString();
    saveItems(VERIFICATION_KEY, verifications);
    addAuditLog(v.userId, confirmAction.req.verificationCode, 'Verification Approved', before, 'APPROVED');
    addNotification(v.userId, 'verification_approved', 'Congratulations! Your account has been successfully verified.');
    notifyDashboard();
    setProcessing(false);
    setModalSuccess('Verification approved successfully');
    setConfirmAction(null);
    fetchData();
    if (selectedReq?.id === confirmAction.req.id) {
      const updated = getItems<any>(VERIFICATION_KEY).find((r: any) => r.id === confirmAction.req.id);
      if (updated) {
        const user = getItems<any>(USERS_KEY).find((u: any) => u.id === updated.userId);
        setSelectedReq({ ...updated, fullName: user?.fullName || 'Unknown', email: updated.email || user?.email || '-', phone: updated.mobileNumber || user?.phone || '-', verificationCode: updated.verificationCode || '-' });
      }
    }
  };

  const handleReject = async () => {
    if (!confirmAction) return;
    setProcessing(true); setModalError('');
    const verifications = getItems<any>(VERIFICATION_KEY);
    const v = verifications.find((r: any) => r.id === confirmAction.req.id);
    if (!v) { setModalError('Verification request not found.'); setProcessing(false); return; }
    if (v.status !== 'PENDING') { setModalError('This request has already been processed.'); setProcessing(false); return; }
    const before = v.status;
    v.status = 'REJECTED';
    v.updatedAt = new Date().toISOString();
    saveItems(VERIFICATION_KEY, verifications);
    addAuditLog(v.userId, confirmAction.req.verificationCode, 'Verification Rejected', before, 'REJECTED');
    addNotification(v.userId, 'verification_rejected', `Your verification request has been rejected. Reason: ${rejectReason || 'N/A'}`);
    notifyDashboard();
    setProcessing(false);
    setModalSuccess('Verification rejected');
    setConfirmAction(null);
    setRejectReason('');
    fetchData();
    if (selectedReq?.id === confirmAction.req.id) {
      const updated = getItems<any>(VERIFICATION_KEY).find((r: any) => r.id === confirmAction.req.id);
      if (updated) {
        const user = getItems<any>(USERS_KEY).find((u: any) => u.id === updated.userId);
        setSelectedReq({ ...updated, fullName: user?.fullName || 'Unknown', email: updated.email || user?.email || '-', phone: updated.mobileNumber || user?.phone || '-', verificationCode: updated.verificationCode || '-' });
      }
    }
  };

  const exportCSV = () => {
    const headers = ['Verification Code', 'User ID', 'Full Name', 'Email', 'Mobile Number', 'Status', 'Submitted Date', 'Updated Date'];
    const rows = sorted.map((r: any) => [r.verificationCode, r.userId, r.fullName, r.email, r.phone, r.status, r.createdAt, r.updatedAt || ''].join(','));
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `verifications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px' }}>{sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'expired': return '#6B7280';
      default: return '#6B7280';
    }
  };

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
          Verification Management <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '10px' }}>{sorted.length} requests</span>
        </h1>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#D1D5DB', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, phone, code..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {modalSuccess && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}><span>✅ {modalSuccess}</span><button onClick={() => setModalSuccess('')} style={{ color: '#10B981', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button></div>}
      {modalError && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}><span>❌ {modalError}</span><button onClick={() => setModalError('')} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button></div>}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(17,24,39,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ label: 'Verification Code', field: null }, { label: 'User', field: null }, { label: 'Email', field: 'email' as SortField }, { label: 'Mobile', field: 'mobileNumber' as SortField }, { label: 'Status', field: 'status' as SortField }, { label: 'Date', field: 'createdAt' as SortField }, { label: 'Actions', field: null }].map(col => (
              <th key={col.label} onClick={() => col.field && handleSort(col.field)} style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: col.field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>{col.label} {col.field && <SortIcon field={col.field} />}</th>
            ))}</tr></thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 12px', color: '#D1D5DB', fontFamily: 'monospace', fontSize: '11px' }}>{r.verificationCode}</td>
                <td style={{ padding: '10px 12px', color: '#FFFFFF', fontWeight: 500 }}>{r.fullName}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{r.email}</td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{r.phone}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(r.status)}15`, color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}22` }}>{r.status}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => { setSelectedReq(r); setModalSuccess(''); setModalError(''); }} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>View</button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No verification requests found.</td></tr>}
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
        {selectedReq && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px' }}
          onClick={() => setSelectedReq(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#1A2235', borderRadius: '16px', width: '100%', maxWidth: '700px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>Verification Details</h2>
              <button onClick={() => setSelectedReq(null)} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* User Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>User Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[{ label: 'User ID', value: selectedReq.userId }, { label: 'Full Name', value: selectedReq.fullName }, { label: 'Email', value: selectedReq.email }, { label: 'Mobile Number', value: selectedReq.phone }].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Verification Info */}
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>Verification Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Verification Code', value: selectedReq.verificationCode },
                  { label: 'Verification Status', value: <span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: `${statusColor(selectedReq.status)}15`, color: statusColor(selectedReq.status), border: `1px solid ${statusColor(selectedReq.status)}22` }}>{selectedReq.status}</span> },
                  { label: 'Submitted Date', value: new Date(selectedReq.createdAt).toLocaleString() },
                  { label: 'Updated Date', value: selectedReq.updatedAt ? new Date(selectedReq.updatedAt).toLocaleString() : '-' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: '4px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: '#E5E7EB', fontWeight: 500 }}>{f.value || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {selectedReq.status === 'pending' && <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button onClick={() => setConfirmAction({ type: 'reject', req: selectedReq })} style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                <button onClick={() => setConfirmAction({ type: 'approve', req: selectedReq })} style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              </div>}
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
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>{confirmAction.type === 'approve' ? 'Approve Verification' : 'Reject Verification'}</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Verification Code</span><span style={{ fontSize: '12px', fontWeight: 600, color: '#D1D5DB', fontFamily: 'monospace' }}>{confirmAction.req.verificationCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>User</span><span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>{confirmAction.req.fullName}</span>
              </div>
            </div>
            {confirmAction.type === 'approve' && <p style={{ fontSize: '12px', color: 'rgba(16,185,129,0.7)', marginBottom: '16px', padding: '10px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)' }}>This will mark the user as verified across the entire platform.</p>}
            {confirmAction.type === 'reject' && <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Rejection Reason</div>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason..." rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical' }} />
            </div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              <button onClick={confirmAction.type === 'approve' ? handleApprove : handleReject} disabled={processing}
                style={{ padding: '8px 16px', borderRadius: '8px', background: confirmAction.type === 'approve' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${confirmAction.type === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: confirmAction.type === 'approve' ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 600, cursor: processing ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: processing ? 0.5 : 1 }}>
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
});

AdminVerification.displayName = 'AdminVerification';