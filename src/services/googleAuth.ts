/**
 * Google OAuth Integration using Google Identity Services (GIS)
 * 
 * This is a frontend-only OAuth flow. No backend server required.
 * Google's Identity Services handles the token exchange client-side.
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

const USERS_KEY = 'coltion_users';
const SESSION_KEY = 'coltion_session';

// Load the Google Identity Services script
function loadGIScript(): Promise<void> {
  return new Promise((resolve, reject) => {
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
}

export interface GoogleUserData {
  id: string;
  email: string;
  fullName: string;
  picture: string;
}

export const googleAuth = {
  /**
   * Initialize Google Sign-In and return user data on success.
   * This uses the One Tap / Popup flow.
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

    await loadGIScript();

    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid profile email',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || 'Google sign-in failed'));
            return;
          }

          try {
            // Decode the ID token to get user info
            const payload = JSON.parse(atob(response.id_token.split('.')[1]));
            
            const userData: GoogleUserData = {
              id: payload.sub,
              email: payload.email,
              fullName: payload.name,
              picture: payload.picture,
            };

            resolve(userData);
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
   * Stores user in the same localStorage as email/password auth.
   */
  async loginWithGoogle(): Promise<{ user: any; isNew: boolean }> {
    const googleUser = await this.signIn();
    
    // Check if user already exists by email
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let existingUser = users.find((u: any) => u.email === googleUser.email);
    let isNew = false;

    if (!existingUser) {
      // Create new user
      const newUser = {
        id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        displayId: String(Math.floor(1000000000 + Math.random() * 9000000000)),
        fullName: googleUser.fullName,
        email: googleUser.email,
        phone: '',
        password: 'google_oauth_' + Date.now(),
        createdAt: Date.now(),
        invitationCode: 'GOOGLE_' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        invitationLink: '',
        invitedBy: null,
        referralCount: 0,
        totalReferralEarnings: 0,
        googleId: googleUser.id,
        picture: googleUser.picture,
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      existingUser = newUser;
      isNew = true;
    }

    // Create session
    const { password: _, ...safeUser } = existingUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));

    // Notify dashboard
    try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}

    return { user: safeUser, isNew };
  },
};