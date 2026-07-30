/**
 * Admin API Client - all operations go through backend API.
 * No localStorage used. Admin token stored in sessionStorage.
 * Uses Vite proxy in development, direct URL in production.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let adminToken: string | null = null;

function getAdminToken(): string | null {
  if (!adminToken) {
    adminToken = sessionStorage.getItem('coltion_admin_token');
  }
  return adminToken;
}

export function setAdminToken(token: string): void {
  adminToken = token;
  sessionStorage.setItem('coltion_admin_token', token);
}

export function clearAdminToken(): void {
  adminToken = null;
  sessionStorage.removeItem('coltion_admin_token');
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || `Request failed with status ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const adminApi = {
  // Auth
  login: (username: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: any }>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Dashboard
  getDashboard: () => api<any>('/dashboard'),

  // Users
  getUsers: () => api<any[]>('/users'),
  deleteUser: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),

  // Deposits
  getDeposits: () => api<any[]>('/deposits'),
  approveDeposit: (id: string) => api(`/deposits/${id}/approve`, { method: 'PUT' }),
  rejectDeposit: (id: string, reason?: string) =>
    api(`/deposits/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  // Withdrawals
  getWithdrawals: () => api<any[]>('/withdrawals'),
  approveWithdrawal: (id: string) => api(`/withdrawals/${id}/approve`, { method: 'PUT' }),
  rejectWithdrawal: (id: string, reason?: string) =>
    api(`/withdrawals/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),

  // Orders
  getOrders: () => api<any[]>('/orders'),

  // Transactions
  getTransactions: () => api<any[]>('/transactions'),

  // Verifications
  getVerifications: () => api<any[]>('/verifications'),
  approveVerification: (id: string) => api(`/verifications/${id}/approve`, { method: 'PUT' }),
  rejectVerification: (id: string) => api(`/verifications/${id}/reject`, { method: 'PUT' }),

  // Settings
  getSettings: () => api<any>('/settings'),
  updateSettings: (settings: any) => api('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Agents
  getAgents: () => api<any[]>('/agents'),
  getAgentProfile: (agentId: string) => api<any>(`/agents/${agentId}`),
  getAgentReferrals: (agentId: string) => api<any[]>(`/agents/${agentId}/referrals`),
  getAgentCommissions: (agentId: string) => api<any[]>(`/agents/${agentId}/commissions`),
  suspendAgent: (agentId: string) => api(`/agents/${agentId}/suspend`, { method: 'PUT' }),
  banAgent: (agentId: string) => api(`/agents/${agentId}/ban`, { method: 'PUT' }),
  reactivateAgent: (agentId: string) => api(`/agents/${agentId}/reactivate`, { method: 'PUT' }),
  forceLogoutAgent: (agentId: string) => api(`/agents/${agentId}/force-logout`, { method: 'PUT' }),
  resetAgentCode: (agentId: string) => api(`/agents/${agentId}/reset-code`, { method: 'PUT' }),
  resetAgentPassword: (agentId: string) => api(`/agents/${agentId}/reset-password`, { method: 'PUT' }),
};