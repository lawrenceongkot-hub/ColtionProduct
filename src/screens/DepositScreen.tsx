import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { transactionService } from '../services/transactionService';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { FORMAT_CURRENCY } from '../constants';

interface DepositScreenProps {
  onBack: () => void;
}

const PAYMENT_METHODS = [
  { id: 'GCash', label: 'GCash', icon: 'G' },
  { id: 'Maya', label: 'Maya', icon: 'M' },
  { id: 'QRPH', label: 'QRPH', icon: 'Q' },
];

const QUICK_AMOUNTS = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000, 50000];
const MIN_DEPOSIT = 100;
const MAX_DEPOSIT = 50000;

export const DepositScreen: React.FC<DepositScreenProps> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [method, setMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ ref: string; id: string } | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;

  const handleQuickAmount = useCallback((val: number) => {
    setAmount(val.toString());
    setSelectedQuick(val);
    setCustomError(null);
  }, []);

  const handleCustomAmount = useCallback((val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setAmount(clean);
    setSelectedQuick(null);
    setCustomError(null);
  }, []);

  const validate = useCallback((): boolean => {
    if (!method) { setCustomError('Please select a payment method.'); return false; }
    if (numericAmount < MIN_DEPOSIT) { setCustomError(`Minimum deposit is ${FORMAT_CURRENCY(MIN_DEPOSIT)}.`); return false; }
    if (numericAmount > MAX_DEPOSIT) { setCustomError(`Maximum deposit is ${FORMAT_CURRENCY(MAX_DEPOSIT)}.`); return false; }
    setCustomError(null);
    return true;
  }, [method, numericAmount]);

  const handleProceed = useCallback(() => {
    if (!validate()) return;
    setStep('confirm');
  }, [validate]);

  const handleConfirmDeposit = useCallback(async () => {
    if (!user || !method) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const tx = await transactionService.createDeposit(user.id, method, numericAmount);
      setResult({ ref: tx.reference, id: tx.id });
    } catch (e: any) {
      setCustomError(e.message || 'Failed to create deposit');
    }
    setIsProcessing(false);
  }, [user, method, numericAmount]);

  const handleSimulateSuccess = useCallback(() => {
    if (!user || !result) return;
    transactionService.confirmDeposit(result.id, user.id, numericAmount);
    onBack();
  }, [user, result, numericAmount, onBack]);

  if (!user) return null;

  return (
    <div style={{
      maxWidth: 'clamp(320px, 90vw, 600px)', margin: '0 auto',
      padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)',
    }}>
      <motion.button onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: colors.textSecondary, fontSize: typography.sm,
          fontFamily: typography.fontFamily, fontWeight: typography.medium,
          background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer',
          marginBottom: 'clamp(16px, 2.5vh, 24px)',
        }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>Back
      </motion.button>

      <GlassCard maxWidth="100%">
        {result ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h3 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Payment Pending</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', textAlign: 'left' }}>
              <Row label="Reference" value={result.ref} />
              <Row label="Amount" value={FORMAT_CURRENCY(numericAmount)} />
              <Row label="Method" value={method || ''} />
              <Row label="Status" value="Pending" />
            </div>
            <p style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Complete the payment within 5 minutes or it will expire.</p>
            <Button variant="primary" size="md" fullWidth onClick={handleSimulateSuccess}>Simulate Payment Success</Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}>
            <h2 style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily, textAlign: 'center' }}>Deposit</h2>

            {step === 'confirm' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 'clamp(12px, 2vw, 16px)', background: colors.bgGlassLight, borderRadius: borderRadius.md }}>
                  <Row label="Payment Method" value={method || ''} />
                  <Row label="Deposit Amount" value={FORMAT_CURRENCY(numericAmount)} />
                  <Row label="Processing Fee" value="₱0.00" />
                  <div style={{ height: '1px', background: colors.borderDefault }} />
                  <Row label="Total Amount" value={FORMAT_CURRENCY(numericAmount)} highlight />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" size="md" fullWidth onClick={() => setStep('form')}>Cancel</Button>
                  <Button variant="primary" size="md" fullWidth loading={isProcessing} onClick={handleConfirmDeposit}>Confirm Deposit</Button>
                </div>
              </motion.div>
            ) : (
              <>
                <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily }}>Select Payment Method</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {PAYMENT_METHODS.map(pm => (
                    <motion.button key={pm.id}
                      onClick={() => { setMethod(pm.id); setCustomError(null); }}
                      style={{
                        padding: 'clamp(12px, 2vw, 16px)', background: method === pm.id ? colors.primary + '20' : colors.bgGlass,
                        border: `1.5px solid ${method === pm.id ? colors.primary : colors.borderDefault}`,
                        borderRadius: borderRadius.md, cursor: 'pointer', textAlign: 'center',
                      }}
                      whileHover={{ background: method === pm.id ? colors.primary + '20' : colors.bgGlassLight }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: colors.gradientBlue,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                        fontSize: typography.sm, fontWeight: typography.bold, color: colors.textPrimary,
                      }}>{pm.icon}</div>
                      <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>{pm.label}</p>
                    </motion.button>
                  ))}
                </div>

                <div>
                  <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>Enter Amount</p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: 'clamp(12px, 2vw, 16px)', background: colors.bgGlassLight,
                    border: `1.5px solid ${colors.borderDefault}`, borderRadius: borderRadius.md,
                  }}>
                    <span style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>₱</span>
                    <input type="text" inputMode="numeric" value={amount} onChange={e => handleCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: colors.textPrimary, fontSize: typography.lg, fontWeight: typography.bold,
                        fontFamily: typography.fontFamily,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: '8px' }}>Quick Amount</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {QUICK_AMOUNTS.map(val => (
                      <motion.button key={val} onClick={() => handleQuickAmount(val)}
                        style={{
                          padding: '6px 14px', background: selectedQuick === val ? colors.primary + '20' : colors.bgGlass,
                          border: `1px solid ${selectedQuick === val ? colors.primary : colors.borderDefault}`,
                          borderRadius: borderRadius.sm, cursor: 'pointer',
                          fontSize: typography.sm, fontWeight: typography.medium, color: selectedQuick === val ? colors.primary : colors.textSecondary,
                          fontFamily: typography.fontFamily,
                        }}
                        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}
                      >
                        {FORMAT_CURRENCY(val)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {customError && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                      {customError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                  Min: {FORMAT_CURRENCY(MIN_DEPOSIT)} &nbsp;|&nbsp; Max: {FORMAT_CURRENCY(MAX_DEPOSIT)}
                </p>

                <Button variant="primary" size="lg" fullWidth onClick={handleProceed}>Proceed to Deposit</Button>
              </>
            )}
          </motion.div>
        )}
      </GlassCard>
    </div>
  );
});

DepositScreen.displayName = 'DepositScreen';

const Row: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: typography.sm, color: colors.textTertiary, fontFamily: typography.fontFamily }}>{label}</span>
    <span style={{ fontSize: typography.base, fontWeight: highlight ? typography.bold : typography.semibold, color: highlight ? colors.success : colors.textPrimary, fontFamily: typography.fontFamily }}>{value}</span>
  </div>
);