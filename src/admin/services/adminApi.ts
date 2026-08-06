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
  wipeAllUsers: () => api<any>('/users/wipe-all', { method: 'DELETE' }),
  deleteUser: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
  getAuditLog: (userId: string) => api<any[]>(`/users/${userId}/audit`),
  getWalletBalances: (userId: string) => api<any>(`/users/${userId}/wallet`),
  // Demo Accounts
  createDemoUser: (data: any) => api('/demo-users', { method: 'POST', body: JSON.stringify(data) }),
  getDemoUsers: () => api<any[]>('/demo-users'),
  convertToDemo: (userId: string) => api(`/users/${userId}/convert-demo`, { method: 'PATCH' }),
  convertToReal: (userId: string) => api(`/users/${userId}/convert-real`, { method: 'PATCH' }),
  addMainWallet: (userId: string, amount: number) => api(`/users/${userId}/wallet/main/add`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  deductMainWallet: (userId: string, amount: number) => api(`/users/${userId}/wallet/main/deduct`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  addSemWallet: (userId: string, amount: number) => api(`/users/${userId}/wallet/sem/add`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  deductSemWallet: (userId: string, amount: number) => api(`/users/${userId}/wallet/sem/deduct`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  banUser: (userId: string) => api(`/users/${userId}/ban`, { method: 'PUT' }),
  unbanUser: (userId: string) => api(`/users/${userId}/unban`, { method: 'PUT' }),
  suspendUser: (userId: string) => api(`/users/${userId}/suspend`, { method: 'PUT' }),
  activateUser: (userId: string) => api(`/users/${userId}/activate`, { method: 'PUT' }),
  forceLogout: (userId: string) => api(`/users/${userId}/force-logout`, { method: 'PUT' }),
  changePassword: (userId: string, newPassword: string) => api(`/users/${userId}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),

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
  getOrderProfitHistory: (orderId: string) => api<any[]>(`/orders/${orderId}/profit-history`),
  pauseOrder: (orderId: string) => api(`/orders/${orderId}/pause`, { method: 'PUT' }),
  resumeOrder: (orderId: string) => api(`/orders/${orderId}/resume`, { method: 'PUT' }),
  cancelOrder: (orderId: string, reason?: string) => api(`/orders/${orderId}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  completeOrder: (orderId: string) => api(`/orders/${orderId}/complete`, { method: 'PUT' }),
  manualCreditProfit: (orderId: string) => api(`/orders/${orderId}/credit-profit`, { method: 'PUT' }),

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