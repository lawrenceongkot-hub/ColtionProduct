import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

export const AdminVerification: React.FC = React.memo(() => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await adminApi.getVerifications();
      setRequests(data);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await adminApi.approveVerification(id);
      else await adminApi.rejectVerification(id);
      setActionMsg({ type: 'success', text: `Verification ${action}d successfully` });
      fetchData();
      setTimeout(() => setActionMsg(null), 3000);
    } catch {
      setActionMsg({ type: 'error', text: `Failed to ${action} verification` });
    }
  };

  const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter);

  const styles = {
    container: { padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' },
    title: { fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" },
    select: { padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none', cursor: 'pointer' } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    td: { padding: '10px 12px', fontSize: '13px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.04)' },
    badge: (color: string) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif", background: `${color}15`, color, border: `1px solid ${color}30` }),
    code: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", letterSpacing: '0.08em', fontSize: '13px', fontWeight: 700, color: '#60A5FA' },
    actionBtn: (color: string) => ({ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif", background: `${color}15`, color } as React.CSSProperties),
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Verification Requests</h1>
        <select style={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NONE">Not Verified</option>
        </select>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: actionMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: actionMsg.type === 'success' ? '#10B981' : '#EF4444',
          fontSize: '13px', fontFamily: "'Inter', sans-serif",
        }}>
          {actionMsg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(17,24,39,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Verification Code</th>
                <th style={styles.th}>Requested</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id}>
                  <td style={styles.td}>{req.fullName || req.user?.fullName || 'N/A'}</td>
                  <td style={styles.td}>{req.email}</td>
                  <td style={styles.td}>{req.mobileNumber || 'N/A'}</td>
                  <td style={styles.td}>
                    {req.verificationCode ? (
                      <span style={styles.code}>{req.verificationCode}</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(req.status === 'APPROVED' ? '#10B981' : req.status === 'PENDING' ? '#F59E0B' : req.status === 'REJECTED' ? '#EF4444' : '#6B7280')}>
                      {req.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={styles.actionBtn('#10B981')} onClick={() => handleAction(req.id, 'approve')}>Approve</button>
                        <button style={styles.actionBtn('#EF4444')} onClick={() => handleAction(req.id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>No verification requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

AdminVerification.displayName = 'AdminVerification';