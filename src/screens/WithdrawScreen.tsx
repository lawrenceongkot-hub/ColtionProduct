import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/walletService';
import { ewalletService } from '../services/ewalletService';
import { verificationService } from '../services/verificationService';
import { apiService } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GlassCard } from '../components/GlassCard';
import { WithdrawalMaintenancePage } from './WithdrawalMaintenancePage';
import { FORMAT_CURRENCY } from '../constants';
import { maskWalletNumber } from '../utils/helpers';
import type { EWallet } from '../types';

interface WithdrawScreenProps {
  onBack: () => void;
}

export const WithdrawScreen: React.FC<WithdrawScreenProps> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [withdrawalsBlocked, setWithdrawalsBlocked] = React.useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ref: string; amount: number; fee: number; netAmount: number } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [balances, setBalances] = useState({ main: 0, semWallet: 0, ongoing: 0 });

  // Wallet list state
  const [wallets, setWallets] = useState<EWallet[]>([]);
  const [selectedWalletIdx, setSelectedWalletIdx] = useState(0);
  const [highlightNewIdx, setHighlightNewIdx] = useState<number | null>(null);

  // Add E-Wallet form state
  const [addProvider, setAddProvider] = useState<'GCash' | 'Maya' | null>(null);
  const [addWalletNumber, setAddWalletNumber] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const walletListRef = useRef<HTMLDivElement>(null);

  // Check if withdrawals are enabled from backend settings
  useEffect(() => {
    try {
      apiService.get<any>('/settings')
        .then((settings: { withdrawalsEnabled?: boolean; withdrawalMaintenanceMessage?: string }) => {
          if (settings && settings.withdrawalsEnabled === false) {
            setWithdrawalsBlocked(settings.withdrawalMaintenanceMessage || 'Withdrawals are temporarily unavailable due to scheduled maintenance.');
          } else {
            setWithdrawalsBlocked(null);
          }
        })
        .catch(() => setWithdrawalsBlocked(null));
    } catch {
      setWithdrawalsBlocked(null);
    }
  }, []);

  // Load wallets
  const loadWallets = useCallback(async () => {
    const all = await ewalletService.getAllWallets();
    setWallets(all);
    return all;
  }, []);

  // Initialize wallets, verification status, and balances on mount
  useEffect(() => {
    loadWallets();
    if (user) {
      verificationService.isVerified(user.id).then(v => setIsVerified(v));
      walletService.getBalances().then(b => setBalances(b));
    }
  }, [loadWallets, user]);

  if (!user) return null;

  // Show full-screen withdrawal maintenance page
  if (withdrawalsBlocked) {
    return <WithdrawalMaintenancePage onBack={onBack} />;
  }

  const currentWallet = wallets[selectedWalletIdx] || null;
  const hasWallets = wallets.length > 0;
  const isFirstWallet = !hasWallets;
  const numericAmount = parseFloat(amount) || 0;

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPasswordModal(false);
        setShowAddForm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Handle click outside modal
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setShowPasswordModal(false);
    }
  }, []);

  // Scroll to newly added wallet card with smooth animation
  const scrollToWallet = useCallback((idx: number) => {
    setHighlightNewIdx(idx);
    setTimeout(() => {
      if (walletListRef.current) {
        const child = walletListRef.current.children[idx] as HTMLElement;
        if (child) {
          child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
      }
    }, 100);
    // Clear highlight after animation
    setTimeout(() => setHighlightNewIdx(null), 2000);
  }, []);

  const handleAddWalletClick = useCallback(() => {
    if (hasWallets) {
      setShowPasswordModal(true);
      setPasswordError(null);
      setVerifyPassword('');
    } else {
      setShowAddForm(true);
    }
  }, [hasWallets]);

  const handlePasswordVerify = useCallback(async () => {
    if (!hasWallets) return;
    const valid = await ewalletService.verifyPassword(verifyPassword);
    if (!valid) {
      setPasswordError('Incorrect Withdrawal Password');
      return;
    }
    setShowPasswordModal(false);
    setVerifyPassword('');
    setPasswordError(null);
    setShowAddForm(true);
  }, [hasWallets, verifyPassword]);

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordModal(false);
    setVerifyPassword('');
    setPasswordError(null);
  }, []);

  const handleAddWallet = useCallback(async () => {
    if (!user || !addProvider) { setAddError('Please select a wallet provider.'); return; }
    if (addWalletNumber.length !== 11 || !/^\d{11}$/.test(addWalletNumber)) { setAddError('Wallet number must be exactly 11 digits.'); return; }
    if (isFirstWallet) {
      if (!addPassword || addPassword.length < 8) { setAddError('Withdrawal password must be at least 8 characters.'); return; }
      if (addPassword !== addConfirmPassword) { setAddError('Passwords do not match.'); return; }
    }

    setIsAdding(true);
    setAddError(null);

    // Save wallet - password only required for first wallet, backend reuses existing hash for additional wallets
    const saved = await ewalletService.saveWallet(user.id, addProvider, addWalletNumber, isFirstWallet ? addPassword : '');
    if (!saved) {
      setAddError('Failed to save wallet. Please try again.');
      setIsAdding(false);
      return;
    }

    // Immediately reload wallets and select the new one
    const all = await loadWallets();
    const newIdx = all.length - 1;
    setSelectedWalletIdx(newIdx);

    setIsAdding(false);
    setShowAddForm(false);

    // Reset form
    setAddProvider(null);
    setAddWalletNumber('');
    setAddPassword('');
    setAddConfirmPassword('');

    // Scroll to the new wallet after render
    requestAnimationFrame(() => scrollToWallet(newIdx));
  }, [user, addProvider, addWalletNumber, addPassword, addConfirmPassword, isFirstWallet, loadWallets, scrollToWallet]);

  const handleConfirm = useCallback(async () => {
    if (!currentWallet) { setError('No e-wallet selected.'); return; }
    if (numericAmount < 100) { setError('Minimum withdrawal is ₱100.'); return; }
    if (numericAmount > balances.main) { setError('Insufficient balance.'); return; }
    if (!withdrawalPassword) { setError('Please enter your withdrawal password.'); return; }
    const valid = await ewalletService.verifyPassword(withdrawalPassword);
    if (!valid) { setError('Incorrect withdrawal password.'); return; }
    setError(null);
    setIsProcessing(true);
    try {
      const tx = await walletService.withdraw(numericAmount, currentWallet.provider, currentWallet.walletNumber, currentWallet.id);
      // Only show success after the backend returns a real withdrawal record
      if (!tx || !tx.reference) {
        setError('Withdrawal was not created. Please try again.');
      } else {
        const fee = tx.fee || Math.round(numericAmount * 0.10 * 100) / 100;
        const netAmount = tx.netAmount || numericAmount - fee;
        setResult({ ref: tx.reference, amount: numericAmount, fee, netAmount });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to submit withdrawal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [numericAmount, balances.main, withdrawalPassword, currentWallet]);

  if (result) {
    return (
      <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
        <GlassCard maxWidth="100%">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h3 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Withdrawal Submitted</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', textAlign: 'left' }}>
              <Row label="Reference" value={result.ref} />
              <Row label="Gross Amount" value={FORMAT_CURRENCY(result.amount)} />
              <Row label="Fee (10%)" value={`-${FORMAT_CURRENCY(result.fee)}`} />
              <Row label="Net Amount" value={FORMAT_CURRENCY(result.netAmount)} />
              <Row label="Wallet" value={`${currentWallet!.provider} - ${maskWalletNumber(currentWallet!.walletNumber)}`} />
              <Row label="Status" value="Pending" />
            </div>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Your withdrawal is pending admin approval. Funds will be deducted once approved.</p>
            <Button variant="primary" size="md" fullWidth onClick={onBack}>Back to Account</Button>
          </motion.div>
        </GlassCard>
      </div>
    );
  }

  // Unverified users cannot withdraw
  if (!isVerified) {
    return (
      <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
        <BackButton onClick={onBack} />
        <GlassCard maxWidth="100%">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Account Verification Required</h3>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, lineHeight: typography.snug, maxWidth: 'clamp(260px, 70vw, 400px)' }}>
              You need to verify your account before using withdrawal. Please complete account verification first.
            </p>
            <Button variant="primary" size="md" fullWidth onClick={onBack}>
              Verify Account
            </Button>
          </motion.div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <BackButton onClick={onBack} />

      {/* Password Verification MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 32px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
          >
            <motion.div style={{ position: 'absolute', inset: 0, background: colors.overlay }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div ref={modalRef}
              style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 'clamp(300px, 80vw, 420px)', background: colors.bgCard, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, boxShadow: shadows.xl, padding: 'clamp(24px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Enter Withdrawal Password</h3>
              <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center' }}>You need to verify your withdrawal password to add another E-Wallet.</p>
              <Input label="Withdrawal Password" isPassword placeholder="Enter your withdrawal password" value={verifyPassword} onChange={v => { setVerifyPassword(v); setPasswordError(null); }} required />
              {passwordError && <p style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>{passwordError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" size="md" fullWidth onClick={handlePasswordCancel}>Cancel</Button>
                <Button variant="primary" size="md" fullWidth onClick={handlePasswordVerify}>Continue</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add E-Wallet OVERLAY FORM */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 32px)', overflow: 'auto' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <motion.div style={{ position: 'absolute', inset: 0, background: colors.overlay }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!isAdding) setShowAddForm(false); }} />
            <motion.div
              style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 'clamp(320px, 80vw, 480px)', background: colors.bgCard, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, boxShadow: shadows.xl, padding: 'clamp(24px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 20px)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <h3 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Add E-Wallet</h3>
              <div>
                <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '6px' }}>Full Name</p>
                <div style={{ padding: 'clamp(10px, 1.5vh, 14px) clamp(12px, 1.5vw, 16px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md, fontSize: typography.base, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{user.fullName}</div>
              </div>
              <div>
                <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '6px' }}>Wallet Provider</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(['GCash', 'Maya'] as const).map(p => (
                    <motion.button key={p} onClick={() => { setAddProvider(p); setAddError(null); }}
                      style={{ padding: 'clamp(12px, 2vw, 16px)', background: addProvider === p ? colors.primary + '20' : colors.bgGlass, border: `1.5px solid ${addProvider === p ? colors.primary : colors.borderDefault}`, borderRadius: borderRadius.md, cursor: 'pointer', textAlign: 'center' }}
                      whileHover={{ background: addProvider === p ? colors.primary + '20' : colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
                      <p style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{p}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
              <Input label="Wallet Number" type="text" placeholder="09171234567" value={addWalletNumber} onChange={v => { setAddWalletNumber(v.replace(/[^0-9]/g, '').slice(0, 11)); setAddError(null); }} required maxLength={11} />
              {isFirstWallet && (
                <>
                  <Input label="Create Withdrawal Password" isPassword placeholder="Create a withdrawal password" value={addPassword} onChange={v => { setAddPassword(v); setAddError(null); }} required />
                  <Input label="Confirm Withdrawal Password" isPassword placeholder="Re-enter withdrawal password" value={addConfirmPassword} onChange={v => { setAddConfirmPassword(v); setAddError(null); }} required />
                </>
              )}
              {addError && <p style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>{addError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" size="md" fullWidth onClick={() => { if (!isAdding) setShowAddForm(false); }} disabled={isAdding}>Cancel</Button>
                <Button variant="primary" size="md" fullWidth loading={isAdding} onClick={handleAddWallet}>Confirm</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {!hasWallets ? (
        <GlassCard maxWidth="100%">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h3 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>No E-Wallet Account Found</h3>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>Please add an e-wallet account before making a withdrawal.</p>
            <Button variant="primary" size="md" fullWidth onClick={() => setShowAddForm(true)}>Add E-Wallet</Button>
          </motion.div>
        </GlassCard>
      ) : (
        <GlassCard maxWidth="100%">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}>
            <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Withdraw</h2>

            {/* Wallet Carousel - horizontal swipeable */}
            <div ref={walletListRef} style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
              {wallets.map((w, idx) => (
                <motion.div
                  key={w.id || w.provider + w.walletNumber}
                  initial={idx === wallets.length - 1 ? { opacity: 0, x: 50 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  onClick={() => setSelectedWalletIdx(idx)}
                  style={{
                    cursor: 'pointer',
                    flex: '0 0 auto',
                    minWidth: '180px',
                    padding: 'clamp(12px, 2vw, 16px)',
                    background: selectedWalletIdx === idx ? colors.bgGlassLight : colors.bgGlass,
                    border: `1.5px solid ${highlightNewIdx === idx ? colors.success : selectedWalletIdx === idx ? colors.primary : colors.borderDefault}`,
                    borderRadius: borderRadius.md,
                    scrollSnapAlign: 'start',
                    transition: 'all 0.2s ease',
                    boxShadow: highlightNewIdx === idx ? `0 0 20px rgba(16,185,129,0.2)` : 'none',
                  }}
                  whileHover={{ background: colors.bgGlassLight }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: selectedWalletIdx === idx ? colors.gradientBlue : colors.bgGlassMedium,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: typography.xs, fontWeight: typography.bold, color: colors.textPrimary,
                      }}>
                        {w.provider === 'GCash' ? 'G' : 'M'}
                      </div>
                      <div>
                        <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{w.provider}</p>
                        <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamilyMono, letterSpacing: '0.05em' }}>{maskWalletNumber(w.walletNumber)}</p>
                      </div>
                    </div>
                    {selectedWalletIdx === idx && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.primary }} />
                    )}
                  </div>
                  {highlightNewIdx === idx && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: typography.xs, color: colors.success, fontFamily: typography.fontFamily, marginTop: '6px', fontWeight: typography.semibold }}
                    >
                      ✓ New wallet added
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Add E-Wallet Button */}
            <motion.button onClick={handleAddWalletClick}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 'clamp(10px, 1.5vh, 14px)', background: 'transparent', border: `1px dashed ${colors.borderLight}`, borderRadius: borderRadius.md, cursor: 'pointer', fontSize: typography.sm, fontWeight: typography.semibold, color: colors.primary, fontFamily: typography.fontFamily }}
              whileHover={{ background: colors.bgGlass }} whileTap={{ scale: 0.98 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add E-Wallet
            </motion.button>

            {/* Selected Wallet Info + Withdrawal Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(14px, 2vw, 18px)', background: colors.bgGlassLight, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Full Name</span>
                <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{user.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Provider</span>
                <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{currentWallet!.provider}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Wallet Number</span>
                <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamilyMono, letterSpacing: '0.05em' }}>{maskWalletNumber(currentWallet!.walletNumber)}</span>
              </div>
              <div style={{ height: '1px', background: colors.borderDefault, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Available Balance</span>
                <span style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{FORMAT_CURRENCY(balances.main)}</span>
              </div>
            </div>

            <div>
              <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>Withdrawal Amount</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'clamp(12px, 2vw, 16px)', background: colors.bgGlassLight, border: `1.5px solid ${colors.borderDefault}`, borderRadius: borderRadius.md }}>
                <span style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>₱</span>
                <input type="text" inputMode="numeric" value={amount} onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                  placeholder="Enter amount" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: colors.textPrimary, fontSize: typography.lg, fontWeight: typography.bold, fontFamily: typography.fontFamily }} />
              </div>
            </div>

            <Input label="Withdrawal Password" isPassword placeholder="Enter your withdrawal password" value={withdrawalPassword} onChange={v => { setWithdrawalPassword(v); setError(null); }} required />

            <AnimatePresence mode="wait">
              {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>{error}</motion.p>}
            </AnimatePresence>

            <Button variant="primary" size="lg" fullWidth loading={isProcessing} onClick={handleConfirm}>Submit Withdrawal</Button>
          </motion.div>
        </GlassCard>
      )}
    </div>
  );
});

WithdrawScreen.displayName = 'WithdrawScreen';

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
    whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
  </motion.button>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{label}</span>
    <span style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{value}</span>
  </div>
);