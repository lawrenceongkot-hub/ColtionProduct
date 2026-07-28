/**
 * Google OAuth Integration using Google Identity Services (GIS)
 * 
 * Uses the Google Sign-In with ID token flow.
 * Sends the Google ID token to the backend for verification and user creation.
 */

import { setTokens } from './api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface GoogleUserData {
  id: string;
  email: string;
  fullName: string;
  picture: string;
}

export const googleAuth = {
  /**
   * Initialize Google Sign-In and return user data on success.
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
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid profile email',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || 'Google sign-in failed'));
            return;
          }

          try {
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

      tokenClient.requestAccessToken();
    });
  },

  /**
   * Login or register with Google via backend API.
   * Sends the Google ID token to the server for verification.
   */
  async loginWithGoogle(): Promise<{ user: any; isNew: boolean }> {
    const googleUser = await this.signIn();
    
    // Read referral code from URL if present
    let referralCode: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      referralCode = params.get('ref');
    } catch {}

    // Send to backend for verification and user creation
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: googleUser.id,
        email: googleUser.email,
        fullName: googleUser.fullName,
        picture: googleUser.picture,
        referralCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google authentication failed');
    }

    const data = await res.json();
    
    // Set JWT tokens
    setTokens(data.accessToken, data.refreshToken);

    return { user: data.user, isNew: data.isNew };
  },
};