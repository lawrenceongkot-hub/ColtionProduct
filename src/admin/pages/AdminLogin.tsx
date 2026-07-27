import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { adminAuth } from '../services/adminAuth';

interface Props {
  onLogin: () => void;
}

export const AdminLogin: React.FC<Props> = React.memo(({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Please enter username and password.'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600));
    const result = adminAuth.login(username, password);
    if (result) {
      onLogin();
    } else {
      setError('Invalid username or password.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0A0E1A 0%, #1A2235 100%)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(26,34,53,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: 'clamp(32px, 5vw, 48px)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #0033CC, #0066FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '4px' }}>Coltion Product</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Admin Panel</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Username" type="text" placeholder="Enter username" value={username} onChange={setUsername} required />
          <Input label="Password" isPassword placeholder="Enter password" value={password} onChange={setPassword} required />
          {error && <p style={{ fontSize: '13px', color: '#EF4444', fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>{error}</p>}
          <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleLogin}>Sign In</Button>
        </div>

        <p style={{ fontSize: '11px', color: '#4B5563', fontFamily: "'Inter', sans-serif", textAlign: 'center', marginTop: '24px' }}>
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
});