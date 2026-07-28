import React, { useState, useCallback } from 'react';
import { adminAuth } from '../services/adminAuth';
import { adminApi } from '../services/adminApi';

interface AdminLoginProps {
  onLogin: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = React.memo(({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminAuth.login(username, password);
      if (result) {
        onLogin();
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Login failed. Check server connection.');
    }
    setLoading(false);
  }, [username, password, onLogin]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0E1A', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: '380px',
        background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '32px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #0066FF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Coltion Admin
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", marginTop: '8px' }}>
            Sign in to your account
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444', fontSize: '13px', fontFamily: "'Inter', sans-serif", textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", marginBottom: '6px', display: 'block' }}>
            Username
          </label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
            placeholder="Enter username"
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", marginBottom: '6px', display: 'block' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#FFFFFF', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
            placeholder="Enter password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #0066FF, #0052CC)',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
});

AdminLogin.displayName = 'AdminLogin';