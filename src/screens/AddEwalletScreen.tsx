import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { ewalletService } from '../services/ewalletService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GlassCard } from '../components/GlassCard';

interface AddEwalletScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export const AddEwalletScreen: React.FC<AddEwalletScreenProps> = React.memo(({ onBack, onComplete }) => {
  const { user } = useAuth();
  const [provider, setProvider] = useState<'GCash' | 'Maya' | null>(null);
  const [walletNumber, setWalletNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user || !provider) { setError('Please select a wallet provider.'); return; }
    if (walletNumber.length !== 11 || !/^\d{11}$/.test(walletNumber)) { setError('Wallet number must be exactly 11 digits.'); return; }
    if (!password || password.length < 8) { setError('Withdrawal password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    ewalletService.saveWallet(user.id, provider, walletNumber, password);
    setIsLoading(false);
    onComplete();
  }, [user, provider, walletNumber, password, confirmPassword, onComplete]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <motion.button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
      </motion.button>

      <GlassCard maxWidth="100%">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 20px)' }}>
          <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Add E-Wallet</h2>

          <div>
            <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>Full Name</p>
            <div style={{ padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md, fontSize: typography.base, color: colors.textPrimary, fontFamily: typography.fontFamily }}>
              {user.fullName}
            </div>
          </div>

          <div>
            <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>Wallet Provider</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(['GCash', 'Maya'] as const).map(p => (
                <motion.button key={p} onClick={() => { setProvider(p); setError(null); }}
                  style={{ padding: 'clamp(12px, 2vw, 16px)', background: provider === p ? colors.primary + '20' : colors.bgGlass, border: `1.5px solid ${provider === p ? colors.primary : colors.borderDefault}`, borderRadius: borderRadius.md, cursor: 'pointer', textAlign: 'center' }}
                  whileHover={{ background: provider === p ? colors.primary + '20' : colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
                  <p style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{p}</p>
                </motion.button>
              ))}
            </div>
          </div>

          <Input label="Wallet Number" type="text" placeholder="09171234567" value={walletNumber} onChange={v => { setWalletNumber(v.replace(/[^0-9]/g, '').slice(0, 11)); setError(null); }} required maxLength={11} />

          <Input label="Withdrawal Password" isPassword placeholder="Create a withdrawal password" value={password} onChange={v => { setPassword(v); setError(null); }} required />
          <Input label="Confirm Withdrawal Password" isPassword placeholder="Re-enter withdrawal password" value={confirmPassword} onChange={v => { setConfirmPassword(v); setError(null); }} required />

          {error && <p style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>{error}</p>}
          <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Minimum 8 characters. Must include uppercase, lowercase, and number.</p>

          <Button variant="primary" size="lg" fullWidth loading={isLoading} onClick={handleSave}>Confirm</Button>
        </motion.div>
      </GlassCard>
    </div>
  );
});

AddEwalletScreen.displayName = 'AddEwalletScreen';