import { adminApi, setAdminToken, clearAdminToken, isAdminAuthenticated } from './adminApi';

interface AdminUser {
  id: string;
  username: string;
  role: string;
  name: string;
}

export const adminAuth = {
  async init(): Promise<void> {
    // Already initialized via adminApi token check
  },

  async login(username: string, password: string): Promise<AdminUser | null> {
    try {
      const data = await adminApi.login(username, password);
      setAdminToken(data.accessToken);
      return data.user ? { id: data.user.id, username: data.user.email || username, role: data.user.role || 'admin', name: data.user.fullName || username } : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    clearAdminToken();
  },

  getSession(): AdminUser | null {
    try {
      const token = sessionStorage.getItem('coltion_admin_token');
      if (!token) return null;
      // Decode JWT to get basic info
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        username: payload.username,
        role: payload.role || 'admin',
        name: payload.name || payload.username || 'Admin',
      };
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return isAdminAuthenticated();
  },
};