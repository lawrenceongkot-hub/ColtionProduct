import type { User, LoginFormData, RegisterFormData } from '../types';
import { generateUniqueCode, getAllInvitationCodes, recordReferral } from './referralService';
import { registrationGuard } from './registrationGuard';
import { agentService } from './agentService';
import { getReferralLink } from '../utils/domain';

// Notify dashboard of login/logout for real online user tracking
function recordLoginSession(userId: string): void {
  try {
    const sessions = JSON.parse(localStorage.getItem('coltion_active_sessions') || '[]');
    if (!sessions.find((s: any) => s.userId === userId)) {
      sessions.push({ userId, loggedInAt: Date.now() });
      localStorage.setItem('coltion_active_sessions', JSON.stringify(sessions));
    }
    window.dispatchEvent(new CustomEvent('dashboard:update'));
  } catch {}
}
function recordLogoutSession(userId: string): void {
  try {
    const sessions = JSON.parse(localStorage.getItem('coltion_active_sessions') || '[]');
    const filtered = sessions.filter((s: any) => s.userId !== userId);
    localStorage.setItem('coltion_active_sessions', JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('dashboard:update'));
  } catch {}
}

const USERS_KEY = 'coltion_users';
const SESSION_KEY = 'coltion_session';

interface StoredUser extends User {
  password: string;
}

function getStoredUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateId(): string {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateDisplayId(existingIds: string[]): string {
  let id: string;
  do {
    id = '';
    for (let i = 0; i < 10; i++) {
      id += Math.floor(Math.random() * 10).toString();
    }
  } while (existingIds.includes(id));
  return id;
}

function getAllDisplayIds(): string[] {
  try {
    const users = getStoredUsers();
    return users.map(u => u.displayId).filter(Boolean);
  } catch {
    return [];
  }
}

function migrateUser(user: StoredUser): StoredUser {
  let migrated = { ...user };
  if (!migrated.displayId) {
    const existingIds = getAllDisplayIds();
    migrated.displayId = generateDisplayId(existingIds);
  }
  if (!migrated.invitationCode) {
    const existingCodes = getAllInvitationCodes();
    const invitationCode = generateUniqueCode(existingCodes);
    migrated.invitationCode = invitationCode;
    migrated.invitationLink = getReferralLink(invitationCode);
    migrated.invitedBy = migrated.invitedBy || null;
    migrated.referralCount = migrated.referralCount || 0;
    migrated.totalReferralEarnings = migrated.totalReferralEarnings || 0;
  }
  return migrated;
}

function persistMigration(updatedUser: StoredUser): void {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === updatedUser.id);
  if (idx !== -1) {
    users[idx] = updatedUser;
    saveUsers(users);
  }
}

export const authService = {
  async login(data: LoginFormData): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const users = getStoredUsers();
    const user = users.find(u => u.email === data.email);

    if (!user) throw new Error('No account found with this email address.');
    if (user.password !== data.password) throw new Error('Incorrect password. Please try again.');

    const migratedUser = migrateUser(user);
    if (migratedUser !== user) persistMigration(migratedUser);

    const { password: _, ...safeUser } = migratedUser;

    if (data.rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    }

    // Record login session for online tracking
    recordLoginSession(safeUser.id);

    return safeUser;
  },

  async register(data: RegisterFormData): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const users = getStoredUsers();

    // Check duplicate email
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase().trim())) {
      throw new Error('Email is already registered.');
    }

    // Check duplicate phone
    if (users.some(u => u.phone === data.phone)) {
      throw new Error('Mobile number is already registered.');
    }

    // Check duplicate full name
    if (registrationGuard.isNameTaken(data.fullName)) {
      throw new Error('This full name is already registered.');
    }

    // Generate unique display ID
    const existingDisplayIds = getAllDisplayIds();
    const displayId = generateDisplayId(existingDisplayIds);

    // Generate unique invitation code
    const existingCodes = getAllInvitationCodes();
    const invitationCode = generateUniqueCode(existingCodes);

    let invitedBy: string | null = null;
    if (data.referralCode) {
      const code = data.referralCode.trim();
      const referrerExists = existingCodes.includes(code);
      if (!referrerExists) throw new Error('Invalid invitation code. Please check and try again.');
      invitedBy = code;
    }

    const invitationLink = getReferralLink(invitationCode);

    const newUser: StoredUser = {
      id: generateId(),
      displayId,
      fullName: data.fullName,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      password: data.password,
      createdAt: Date.now(),
      invitationCode,
      invitationLink,
      invitedBy,
      referralCount: 0,
      totalReferralEarnings: 0,
    };

    users.push(newUser);
    saveUsers(users);
    // Notify dashboard: new user registered
    try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}

    if (invitedBy) {
      recordReferral(invitedBy, newUser.id, newUser.fullName, newUser.email);
    }

    // Award welcome bonus BEFORE recording fingerprint (so bonus check doesn't see itself)
    registrationGuard.awardWelcomeBonusBypass(newUser.id);

    // Record fingerprint AFTER bonus
    registrationGuard.recordFingerprint(newUser.id, newUser.fullName);

    // Check if registered via agent referral code
    if (data.referralCode) {
      const agent = agentService.findAgentByCode(data.referralCode);
      if (agent) {
        agentService.recordReferral(data.referralCode, newUser.id, newUser.fullName, newUser.email);
      }
    }

    const { password: _, ...safeUser } = newUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));

    return safeUser;
  },

  getSession(): User | null {
    try {
      const local = localStorage.getItem(SESSION_KEY);
      const session = sessionStorage.getItem(SESSION_KEY);
      const rawData = local || session;
      if (!rawData) return null;

      const sessionUser: User = JSON.parse(rawData);
      if (!sessionUser.displayId || !sessionUser.invitationCode) {
        const users = getStoredUsers();
        const storedUser = users.find(u => u.id === sessionUser.id);
        if (storedUser) {
          const migrated = migrateUser(storedUser);
          if (migrated !== storedUser) persistMigration(migrated);
          const { password: _, ...safeUser } = migrated;
          if (local) localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
          else sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
          return safeUser;
        }
      }
      return sessionUser;
    } catch {
      return null;
    }
  },

  logout(): void {
    try {
      const session = this.getSession();
      if (session) recordLogoutSession(session.id);
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },

  clearAllData(): void {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },
};