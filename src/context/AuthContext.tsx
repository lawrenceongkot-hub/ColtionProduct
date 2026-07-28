import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState } from '../types';
import { apiService, setTokens, clearTokens, getAccessToken } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (data: { fullName: string; email: string; phone: string; password: string; referralCode?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Read user from legacy localStorage session (used by Google OAuth) */
function getLegacySession(): any | null {
  try {
    const data = localStorage.getItem('coltion_session');
    if (!data) return null;
    return JSON.parse(data);
  } catch { return null; }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      apiService.get('/auth/me')
        .then((user: any) => {
          setState({ user, isAuthenticated: true, isLoading: false });
        })
        .catch(() => {
          // Fallback: check legacy localStorage session (Google OAuth)
          const legacyUser = getLegacySession();
          if (legacyUser) {
            setState({ user: legacyUser, isAuthenticated: true, isLoading: false });
          } else {
            clearTokens();
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        });
    } else {
      // No API token - check legacy localStorage session (Google OAuth)
      const legacyUser = getLegacySession();
      if (legacyUser) {
        setState({ user: legacyUser, isAuthenticated: true, isLoading: false });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const data = await apiService.post('/auth/login', { email, password, rememberMe });
    setTokens(data.accessToken, data.refreshToken);
    setState({ user: data.user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (regData: { fullName: string; email: string; phone: string; password: string; referralCode?: string }) => {
    const data = await apiService.post('/auth/register', regData);
    setTokens(data.accessToken, data.refreshToken);
    setState({ user: data.user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try { await apiService.post('/auth/logout'); } catch {}
    clearTokens();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}