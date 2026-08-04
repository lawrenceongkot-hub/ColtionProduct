import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../services/adminApi';

export const AdminAgents: React.FC = React.memo(() => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [agentDetail, setAgentDetail] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await adminApi.getAgents();
      setAgents(data);
    } catch {
      setAgents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const filtered = agents.filter(a =>
    !search || a.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.agentCode?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewProfile = async (agentId: string) => {
    try {
      const detail = await adminApi.getAgentProfile(agentId);
      setAgentDetail(detail);
      setSelectedAgent(agents.find(a => a.id === agentId) || null);
      setDetailTab('overview');
    } catch {
      showResult('error', 'Failed to load agent profile');
    }
  };

  const handleAction = async (action: string, agentId: string) => {
    showResult(null, '');
    try {
      switch (action) {
        case 'suspend': await adminApi.suspendAgent(agentId); break;
        case 'ban': await adminApi.banAgent(agentId); break;
        case 'reactivate': await adminApi.reactivateAgent(agentId); break;
        case 'forceLogout': await adminApi.forceLogoutAgent(agentId); break;
        case 'resetCode': {
          const result = await adminApi.resetAgentCode(agentId);
          showResult('success', `Code reset to: ${result.agentCode}`);
          break;
        }
        case 'resetPassword': {
          const result = await adminApi.resetAgentPassword(agentId);
          showResult('success', `New password: ${result.newPassword}`);
          break;
        }
      }
      if (action !== 'resetCode' && action !== 'resetPassword') {
        showResult('success', `Agent ${action} successful`);
      }
      fetchAgents();
    } catch {
      showResult('error', `Failed to ${action} agent`);
    }
  };

  const showResult = (type: 'success' | 'error' | null, message: string) => {
    setActionResult(type ? { type, message } : null);
    if (type === 'success') {
      setTimeout(() => setActionResult(null), 5000);
    }
  };

  // Safe date formatting - never render "Invalid Date"
  const formatDate = (value: any): string => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (value: any): string => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (value: any): string => {
    const n = Number(value || 0);
    return isNaN(n) ? '₱0' : `₱${n.toLocaleString()}`;
  };

  const verificationLabel = (v: any): { text: string; color: string } => {
    if (v === 'APPROVED') return { text: 'Verified', color: '#10B981' };
    if (v === 'PENDING') return { text: 'Pending', color: '#F59E0B' };
    if (v === 'REJECTED') return { text: 'Rejected', color: '#EF4444' };
    return { text: 'None', color: '#6B7280' };
  };

  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' },
    title: { fontSize: '20px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" },
    searchInput: {
      padding: '8px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px',
      fontFamily: "'Inter', sans-serif", outline: 'none', width: '260px',
    } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.06)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    td: { padding: '10px 12px', fontSize: '13px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.04)' },
    badge: (color: string) => ({
      display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
      background: `${color}15`, color, border: `1px solid ${color}30`,
    }),
    actionBtn: (color: string) => ({
      padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
      fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
      background: `${color}15`, color,
    } as React.CSSProperties),
    modalOverlay: {
      position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
    },
    modalContent: {
      background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px', maxWidth: '900px', width: '100%', maxHeight: '90vh',
      overflow: 'auto', padding: '28px',
    } as React.CSSProperties,
    sectionTitle: { fontSize: '16px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '16px' },
    statCard: {
      padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.06)',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Agent Management</h1>
        <input
          style={styles.searchInput}
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {actionResult && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: actionResult.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${actionResult.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: actionResult.type === 'success' ? '#10B981' : '#EF4444',
          fontSize: '13px', fontFamily: "'Inter', sans-serif",
        }}>
          {actionResult.message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading...</div>
      ) : (
        <div style={{ background: 'rgba(17,24,39,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Display ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Invitation Code</th>
                <th style={styles.th}>Referrals</th>
                <th style={styles.th}>Valid Referrals</th>
                <th style={styles.th}>Total Deposits</th>
                <th style={styles.th}>Commission</th>
                <th style={styles.th}>Available Balance</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Verification</th>
                <th style={styles.th}>Registered</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(agent => (
                <tr key={agent.id}>
                  <td style={styles.td}><span style={{ fontFamily: "'Courier New', monospace", color: '#60A5FA' }}>{agent.displayId || agent.user?.displayId || '—'}</span></td>
                  <td style={{ ...styles.td, fontWeight: 500, color: '#FFFFFF' }}>{agent.user?.fullName || agent.fullName || '—'}</td>
                  <td style={styles.td}>{agent.user?.email || agent.email || '—'}</td>
                  <td style={styles.td}>{agent.user?.phone || '—'}</td>
                  <td style={styles.td}><span style={{ fontFamily: "'Courier New', monospace", color: '#60A5FA' }}>{agent.user?.invitationCode || agent.agentCode || '—'}</span></td>
                  <td style={styles.td}>{agent.totalReferrals ?? agent.referrals?.length ?? 0}</td>
                  <td style={styles.td}>{agent.usersWithDeposit ?? agent.qualifiedDeposits ?? 0}</td>
                  <td style={styles.td}>{formatCurrency(agent.totalDeposits)}</td>
                  <td style={styles.td}>{formatCurrency(agent.totalCommission)}</td>
                  <td style={styles.td}>{formatCurrency(agent.availableBalance)}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(agent.status === 'active' ? '#10B981' : agent.status === 'suspended' ? '#F59E0B' : '#EF4444')}>
                      {agent.status || 'active'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.badge(verificationLabel(agent.user?.verificationStatus).color)}>
                      {verificationLabel(agent.user?.verificationStatus).text}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(agent.user?.createdAt)}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '80px' }}>
                      <button style={styles.actionBtn('#0066FF')} onClick={() => handleViewProfile(agent.id)}>View</button>
                      <button style={styles.actionBtn('#F59E0B')} onClick={() => handleAction('suspend', agent.id)}>Suspend</button>
                      <button style={styles.actionBtn('#EF4444')} onClick={() => handleAction('ban', agent.id)}>Ban</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                    No agents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Agent Profile Modal */}
      <AnimatePresence>
        {selectedAgent && agentDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={styles.modalContent}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                  Agent Profile: {agentDetail.user?.fullName || selectedAgent.fullName}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={styles.actionBtn('#10B981')} onClick={() => handleAction('reactivate', selectedAgent.id)}>Reactivate</button>
                  <button style={styles.actionBtn('#0066FF')} onClick={() => handleAction('resetCode', selectedAgent.id)}>Reset Code</button>
                  <button style={styles.actionBtn('#F59E0B')} onClick={() => handleAction('resetPassword', selectedAgent.id)}>Reset Password</button>
                  <button style={styles.actionBtn('#EF4444')} onClick={() => setSelectedAgent(null)}>Close</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                {['overview', 'wallet', 'referrals', 'commissions', 'deposits', 'withdrawals', 'transactions', 'loginhistory', 'verification'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: detailTab === tab ? 'rgba(0,102,255,0.15)' : 'transparent',
                      color: detailTab === tab ? '#0066FF' : 'rgba(255,255,255,0.5)',
                      fontSize: '12px', fontWeight: detailTab === tab ? 600 : 400,
                      fontFamily: "'Inter', sans-serif", textTransform: 'capitalize' as const,
                    }}
                  >
                    {tab === 'loginhistory' ? 'Login History' : tab}
                  </button>
                ))}
              </div>

              {detailTab === 'overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Agent Code</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#60A5FA', fontFamily: "'Courier New', monospace" }}>{selectedAgent.agentCode}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Status</p>
                      <span style={styles.badge(selectedAgent.status === 'active' ? '#10B981' : selectedAgent.status === 'suspended' ? '#F59E0B' : '#EF4444')}>
                        {selectedAgent.status || 'active'}
                      </span>
                    </div>
                    {agentDetail.stats && (
                      <>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Total Commission</p>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#10B981', fontFamily: "'Inter', sans-serif" }}>₱{(agentDetail.stats.totalDepositsGenerated || 0).toLocaleString()}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Conversion Rate</p>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#60A5FA', fontFamily: "'Inter', sans-serif" }}>{agentDetail.stats.conversionRate || 0}%</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Pending Commission</p>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F59E0B', fontFamily: "'Inter', sans-serif" }}>₱{(agentDetail.stats.pendingCommission || 0).toLocaleString()}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Available Balance</p>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#10B981', fontFamily: "'Inter', sans-serif" }}>₱{(agentDetail.availableBalance || 0).toLocaleString()}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {agentDetail.user && (
                    <div style={{ marginTop: '16px' }}>
                      <h3 style={styles.sectionTitle}>General Information</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Full Name</p>
                          <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user.fullName}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Email</p>
                          <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user.email}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Phone</p>
                          <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user.phone || 'N/A'}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Invitation Code</p>
                          <p style={{ fontSize: '13px', color: '#60A5FA', fontFamily: "'Courier New', monospace" }}>{agentDetail.user.invitationCode}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Registered</p>
                          <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{formatDate(agentDetail.user.createdAt)}</p>
                        </div>
                        <div style={styles.statCard}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Total Referrals</p>
                          <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.totalReferrals}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'wallet' && (
                <div>
                  <h3 style={styles.sectionTitle}>Wallet Balances</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Main Wallet</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#0066FF' }}>{formatCurrency(agentDetail.user?.wallet?.main)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>SemWallet</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>{formatCurrency(agentDetail.user?.wallet?.semWallet)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Ongoing Wallet</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B' }}>{formatCurrency(agentDetail.user?.wallet?.ongoing)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Available Commission</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>{formatCurrency(agentDetail.availableBalance)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Pending Commission</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B' }}>{formatCurrency(agentDetail.pendingCommission)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Total Commission Earned</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>{formatCurrency(agentDetail.totalCommission)}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'deposits' && (
                <div>
                  <h3 style={styles.sectionTitle}>Deposit History ({agentDetail.deposits?.length || 0})</h3>
                  {agentDetail.deposits?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Reference</th>
                            <th style={styles.th}>Method</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.deposits.map((d: any) => (
                            <tr key={d.id}>
                              <td style={styles.td}>{formatDate(d.createdAt)}</td>
                              <td style={styles.td}><span style={{ fontFamily: "'Courier New', monospace", fontSize: '11px' }}>{d.reference}</span></td>
                              <td style={styles.td}>{d.method}</td>
                              <td style={styles.td}>{formatCurrency(d.amount)}</td>
                              <td style={styles.td}>
                                <span style={styles.badge(d.status === 'SUCCESS' ? '#10B981' : d.status === 'PENDING' ? '#F59E0B' : '#EF4444')}>{d.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No deposits yet</p>
                  )}
                </div>
              )}

              {detailTab === 'withdrawals' && (
                <div>
                  <h3 style={styles.sectionTitle}>Withdrawal History ({agentDetail.withdrawals?.length || 0})</h3>
                  {agentDetail.withdrawals?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Reference</th>
                            <th style={styles.th}>Method</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.withdrawals.map((w: any) => (
                            <tr key={w.id}>
                              <td style={styles.td}>{formatDate(w.createdAt)}</td>
                              <td style={styles.td}><span style={{ fontFamily: "'Courier New', monospace", fontSize: '11px' }}>{w.reference}</span></td>
                              <td style={styles.td}>{w.method}</td>
                              <td style={styles.td}>{formatCurrency(w.amount)}</td>
                              <td style={styles.td}>
                                <span style={styles.badge(w.status === 'SUCCESS' ? '#10B981' : w.status === 'PENDING' ? '#F59E0B' : '#EF4444')}>{w.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No withdrawals yet</p>
                  )}
                </div>
              )}

              {detailTab === 'transactions' && (
                <div>
                  <h3 style={styles.sectionTitle}>Transaction History ({agentDetail.transactions?.length || 0})</h3>
                  {agentDetail.transactions?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Type</th>
                            <th style={styles.th}>Reference</th>
                            <th style={styles.th}>Amount</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.transactions.map((t: any) => (
                            <tr key={t.id}>
                              <td style={styles.td}>{formatDate(t.createdAt)}</td>
                              <td style={styles.td}>{t.type}</td>
                              <td style={styles.td}><span style={{ fontFamily: "'Courier New', monospace", fontSize: '11px' }}>{t.reference}</span></td>
                              <td style={styles.td}>{formatCurrency(t.amount)}</td>
                              <td style={styles.td}>
                                <span style={styles.badge(t.status === 'SUCCESS' ? '#10B981' : t.status === 'PENDING' ? '#F59E0B' : '#EF4444')}>{t.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No transactions yet</p>
                  )}
                </div>
              )}

              {detailTab === 'loginhistory' && (
                <div>
                  <h3 style={styles.sectionTitle}>Login History ({agentDetail.sessions?.length || 0})</h3>
                  {agentDetail.sessions?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Login Time</th>
                            <th style={styles.th}>Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.sessions.map((s: any) => (
                            <tr key={s.id}>
                              <td style={styles.td}>{formatDateTime(s.createdAt)}</td>
                              <td style={styles.td}>{formatDateTime(s.expiresAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No login history</p>
                  )}
                </div>
              )}

              {detailTab === 'verification' && (
                <div>
                  <h3 style={styles.sectionTitle}>Verification</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Email</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user?.email || '—'}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Phone</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user?.phone || '—'}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>KYC Status</p>
                      <span style={styles.badge(verificationLabel(agentDetail.user?.verificationStatus).color)}>{verificationLabel(agentDetail.user?.verificationStatus).text}</span>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Verified At</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{formatDateTime(agentDetail.user?.verifiedAt)}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Registration IP</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF' }}>{agentDetail.user?.registrationIp || '—'}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Device Fingerprint</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF', wordBreak: 'break-all' }}>{agentDetail.user?.deviceFingerprint || '—'}</p>
                    </div>
                    <div style={styles.statCard}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>User Agent</p>
                      <p style={{ fontSize: '13px', color: '#FFFFFF', wordBreak: 'break-all' }}>{agentDetail.user?.userAgent || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'referrals' && (
                <div>
                  <h3 style={styles.sectionTitle}>Referral List ({agentDetail.referrals?.length || 0})</h3>
                  {agentDetail.referrals?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>User</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Registered</th>
                            <th style={styles.th}>Deposit</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.referrals.map((ref: any) => (
                            <tr key={ref.id}>
                              <td style={styles.td}>{ref.fullName}</td>
                              <td style={styles.td}>{ref.email}</td>
                              <td style={styles.td}>{formatDate(ref.registeredDate)}</td>
                              <td style={styles.td}>{ref.firstDeposit ? `₱${ref.firstDeposit}` : '—'}</td>
                              <td style={styles.td}>
                                <span style={styles.badge(ref.status === 'COMMISSION_PAID' ? '#10B981' : '#F59E0B')}>
                                  {ref.status === 'COMMISSION_PAID' ? 'Paid' : 'Waiting'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No referrals yet</p>
                  )}
                </div>
              )}

              {detailTab === 'commissions' && (
                <div>
                  <h3 style={styles.sectionTitle}>Commission History ({agentDetail.commissions?.length || 0})</h3>
                  {agentDetail.commissions?.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>User</th>
                            <th style={styles.th}>Deposit</th>
                            <th style={styles.th}>Rate</th>
                            <th style={styles.th}>Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentDetail.commissions.map((c: any) => (
                            <tr key={c.id}>
                              <td style={styles.td}>{formatDate(c.createdAt)}</td>
                              <td style={styles.td}>{c.referredName}</td>
                              <td style={styles.td}>₱{c.depositAmount.toLocaleString()}</td>
                              <td style={styles.td}>{Math.round(c.commissionRate * 100)}%</td>
                              <td style={{ ...styles.td, color: '#10B981', fontWeight: 600 }}>₱{c.commissionAmount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No commission history</p>
                  )}
                </div>
              )}

              {detailTab === 'tree' && (
                <div>
                  <h3 style={styles.sectionTitle}>Referral Tree</h3>
                  <div style={{ padding: '20px 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{
                        display: 'inline-block', padding: '12px 24px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(0,102,255,0.2), rgba(0,102,255,0.05))',
                        border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF',
                        fontSize: '14px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                      }}>
                        {selectedAgent.fullName} ({selectedAgent.agentCode})
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <svg width="20" height="30" viewBox="0 0 20 30">
                        <line x1="10" y1="0" x2="10" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <polygon points="10,30 5,20 15,20" fill="rgba(255,255,255,0.2)" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                      {agentDetail.referrals?.map((ref: any) => (
                        <div key={ref.id} style={{
                          padding: '10px 16px', borderRadius: '8px',
                          background: ref.status === 'COMMISSION_PAID' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          border: `1px solid ${ref.status === 'COMMISSION_PAID' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          textAlign: 'center', minWidth: '140px',
                        }}>
                          <p style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{ref.fullName}</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                            {ref.firstDeposit ? `₱${ref.firstDeposit}` : 'No deposit'}
                          </p>
                        </div>
                      ))}
                      {(!agentDetail.referrals || agentDetail.referrals.length === 0) && (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', width: '100%', textAlign: 'center' }}>No referrals yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AdminAgents.displayName = 'AdminAgents';