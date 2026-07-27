const ADMIN_KEY = 'coltion_admin';
const ADMIN_SESSION_KEY = 'coltion_admin_session';

interface AdminUser {
  id: string;
  username: string;
  role: 'super_admin' | 'manager' | 'finance' | 'support';
  name: string;
}

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function getAdmins(): AdminUser[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || '[]'); } catch { return []; }
}
function saveAdmins(admins: AdminUser[]): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admins));
}

function getPasswords(): { username: string; password: string }[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY + '_pw') || '[]'); } catch { return []; }
}
function savePasswords(pws: { username: string; password: string }[]): void {
  localStorage.setItem(ADMIN_KEY + '_pw', JSON.stringify(pws));
}

export const adminAuth = {
  /** Initialize default admin with credentials: Admin / Ryeonbaal2004 */
  init(): void {
    const admins = getAdmins();
    const existingAdmin = admins.find(a => a.username === 'Admin');
    if (!existingAdmin) {
      admins.push({
        id: 'admin_001',
        username: 'Admin',
        role: 'super_admin',
        name: 'Super Admin',
      });
      saveAdmins(admins);

      const pws = getPasswords();
      const hashed = simpleHash('Ryeonbaal2004');
      if (!pws.some(p => p.username === 'Admin')) {
        pws.push({ username: 'Admin', password: hashed });
        savePasswords(pws);
      }
    }
  },

  login(username: string, password: string): AdminUser | null {
    this.init();
    const pws = getPasswords();
    const match = pws.find(p => p.username === username && p.password === simpleHash(password));
    if (!match) return null;

    const admins = getAdmins();
    const admin = admins.find(a => a.username === username);
    if (!admin) return null;

    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
    return admin;
  },

  logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  getSession(): AdminUser | null {
    try {
      this.init();
      const data = localStorage.getItem(ADMIN_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};