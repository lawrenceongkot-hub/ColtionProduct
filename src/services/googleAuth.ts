/**
 * Google OAuth Integration using Google Identity Services (GIS)
 * 
 * Uses the Google Sign-In with ID token flow.
 * No backend server required - Google's Identity Services handles everything client-side.
 * 
 * Setup Required:
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project or select existing
 * 3. Go to APIs & Services → Credentials
 * 4. Create OAuth 2.0 Client ID (Web application)
 * 5. Add to Authorized JavaScript origins:
 *    - http://localhost:5173 (development)
 *    - https://coltionproduct.vercel.app (production)
 * 6. Copy the Client ID
 * 7. Create .env file with: VITE_GOOGLE_CLIENT_ID=your_client_id
 */

import { generateUniqueCode, getAllInvitationCodes } from './referralService';
import { getReferralLink } from '../utils/domain';
import { agentService } from './agentService';
import { registrationGuard } from './registrationGuard';
import { setTokens } from './api';

const USERS_KEY = 'coltion_users';
const SESSION_KEY = 'coltion_session';

export interface GoogleUserData {
  id: string;
  email: string;
  fullName: string;
  picture: string;
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

export const googleAuth = {
  /**
   * Initialize Google Sign-In and return user data on success.
   * Uses the Google Identity Services credential response flow.
   */
  async signIn(): Promise<GoogleUserData> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      throw new Error(
        'Google Client ID not configured. ' +
        'Create a .env file with: VITE_GOOGLE_CLIENT_ID=your_client_id\n\n' +
        'To get a Client ID:\n' +
        '1. Go to https://console.cloud.google.com\n' +
        '2. Create a project\n' +
        '3. APIs & Services → Credentials\n' +
        '4. Create OAuth 2.0 Client ID (Web application)\n' +
        '5. Add http://localhost:5173 and https://coltionproduct.vercel.app\n' +
        '   to Authorized JavaScript origins\n' +
        '6. Copy the Client ID'
      );
    }

    // Load the Google Identity Services script
    await new Promise<void>((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });

    return new Promise((resolve, reject) => {
      // Use the credential-based flow (Google Sign-In)
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid profile email',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || 'Google sign-in failed'));
            return;
          }

          try {
            // Decode the ID token from the credential response
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            })
            .then(res => res.json())
            .then((data: any) => {
              if (data.error) {
                reject(new Error(data.error_description || 'Failed to get user info'));
                return;
              }
              resolve({
                id: data.sub,
                email: data.email,
                fullName: data.name,
                picture: data.picture,
              });
            })
            .catch(() => reject(new Error('Failed to fetch Google user info')));
          } catch (err) {
            reject(new Error('Failed to process Google authentication'));
          }
        },
      });

      // Request access token (opens popup)
      tokenClient.requestAccessToken();
    });
  },

  /**
   * Create or login a user with Google data.
   * Uses the SAME invitation code system as website registration.
   * Fully integrates with referral, agent, welcome bonus, and fingerprint systems.
   */
  async loginWithGoogle(): Promise<{ user: any; isNew: boolean }> {
    const googleUser = await this.signIn();
    
    // Check if user already exists by email
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let existingUser = users.find((u: any) => u.email === googleUser.email);
    let isNew = false;

    if (!existingUser) {
      // === Use the SAME invitation code generator as website registration ===
      const existingCodes = getAllInvitationCodes();
      const invitationCode = generateUniqueCode(existingCodes);

      // Generate unique display ID
      const existingDisplayIds = users.map((u: any) => u.displayId).filter(Boolean);
      const displayId = generateDisplayId(existingDisplayIds);

      // Read referral code from URL if present
      let invitedBy: string | null = null;
      let referrerAgentId: string | null = null;
      try {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref');
        if (refCode) {
          const normalizedCode = refCode.trim().toUpperCase();
          // Check if it's a user invitation code
          if (existingCodes.includes(normalizedCode)) {
            invitedBy = normalizedCode;
          }
          // Check if it's an agent code
          const agent = agentService.findAgentByCode(normalizedCode);
          if (agent) {
            referrerAgentId = agent.id;
          }
        }
      } catch {}

      const invitationLink = getReferralLink(invitationCode);

      const newUser = {
        id: generateId(),
        displayId,
        fullName: googleUser.fullName,
        email: googleUser.email,
        phone: '',
        password: 'google_oauth_' + Date.now(),
        createdAt: Date.now(),
        // === Standard 8-character invitation code (NOT GOOGLE_ prefix) ===
        invitationCode,
        invitationLink,
        invitedBy,
        referralCount: 0,
        totalReferralEarnings: 0,
        googleId: googleUser.id,
        picture: googleUser.picture,
        referrerAgentId,
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      existingUser = newUser;
      isNew = true;

      // === POST-REGISTRATION STEPS (same as website registration) ===

      // Record referral if invited by another user
      if (invitedBy) {
        try {
          const { recordReferral } = await import('./referralService');
          recordReferral(invitedBy, newUser.id, newUser.fullName, newUser.email);
        } catch {}
      }

      // Record agent referral if applicable
      if (referrerAgentId) {
        try {
          const refCode = new URLSearchParams(window.location.search).get('ref');
          if (refCode) {
            agentService.recordReferral(refCode, newUser.id, newUser.fullName, newUser.email);
          }
        } catch {}
      }

      // Award welcome bonus
      try {
        registrationGuard.awardWelcomeBonusBypass(newUser.id);
      } catch {}

      // Record fingerprint
      try {
        registrationGuard.recordFingerprint(newUser.id, newUser.fullName);
      } catch {}
    }

    // Create session
    const { password: _, ...safeUser } = existingUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));

    // Set JWT tokens for API client (so AuthContext recognizes the session on reload)
    setTokens(safeUser.id, safeUser.id + '_refresh');

    // Notify dashboard
    try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}

    return { user: safeUser, isNew };
  },
};