import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FIELD_VALIDATION } from '../constants';
import { useAuth } from '../context/AuthContext';
import type { ValidationError } from '../types';

interface Props {
  onBack: () => void;
}

export const ChangePasswordSection: React.FC<Props> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const getError = useCallback((field: string) => errors.find(e => e.field === field)?.message, [errors]);

  const validate = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];
    if (!currentPassword) newErrors.push({ field: 'current', message: 'Current password is required' });
    if (!newPassword) newErrors.push({ field: 'new', message: FIELD_VALIDATION.PASSWORD.errorMessage.required });
    else if (newPassword.length < FIELD_VALIDATION.PASSWORD.minLength) newErrors.push({ field: 'new', message: FIELD_VALIDATION.PASSWORD.errorMessage.minLength });
    else if (!FIELD_VALIDATION.PASSWORD.pattern.test(newPassword)) newErrors.push({ field: 'new', message: FIELD_VALIDATION.PASSWORD.errorMessage.pattern });
    if (!confirmPassword) newErrors.push({ field: 'confirm', message: 'Please confirm your new password' });
    else if (newPassword !== confirmPassword) newErrors.push({ field: 'confirm', message: 'Passwords do not match' });
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError(null);
    if (!validate()) return;
    if (!user) { setBackendError('You must be logged in.'); return; }
    setIsLoading(true);

    try {
      // Verify current password and update to new password in actual storage
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      const storedUser = users.find((u: any) => u.id === user.id);
      
      if (!storedUser) {
        setBackendError('User account not found.');
        setIsLoading(false);
        return;
      }
      
      if (storedUser.password !== currentPassword) {
        setBackendError('Current password is incorrect.');
        setIsLoading(false);
        return;
      }

      // Update password
      storedUser.password = newPassword;
      localStorage.setItem('coltion_users', JSON.stringify(users));

      // Notify dashboard
      try { window.dispatchEvent(new CustomEvent('dashboard:update')); } catch {}

      setIsLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onBack();
      }, 2000);
    } catch (err) {
      setBackendError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }, [validate, onBack, user, currentPassword, newPassword]);

  return (
    <div style={{
      maxWidth: 'clamp(320px, 90vw, 600px)',
      margin: '0 auto',
      padding: 'clamp(16px, 3vw, 32px)',
      paddingBottom: 'clamp(40px, 5vh, 60px)',
    }}>
      <motion.button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: colors.textSecondary, fontSize: typography.sm,
          fontFamily: typography.fontFamily, fontWeight: typography.medium,
          background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer',
          marginBottom: 'clamp(16px, 2.5vh, 24px)',
        }}
        whileHover={{ background: colors.bgGlassLight }}
        whileTap={{ scale: 0.95 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </motion.button>

      <motion.div
        style={{
          width: '100%',
          background: colors.gradientGlass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: borderRadius.xl,
          padding: 'clamp(24px, 3vw, 32px)',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{
          fontSize: typography.lg, fontWeight: typography.bold,
          color: colors.textPrimary, fontFamily: typography.fontFamily,
          marginBottom: 'clamp(20px, 3vh, 28px)',
        }}>
          Change Password
        </h2>

        <AnimatePresence mode="wait">
              {backendError && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: typography.sm, color: colors.error, fontFamily: typography.fontFamily, textAlign: 'center', marginBottom: '8px' }}>
                  {backendError}
                </motion.p>
              )}
              {success ? (
            <motion.div
              key="success"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '12px', padding: 'clamp(20px, 3vh, 32px)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{
                fontSize: typography.base, fontWeight: typography.semibold,
                color: colors.success, fontFamily: typography.fontFamily,
              }}>
                Password changed successfully!
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 20px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Input
                label="Current Password"
                isPassword
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                error={getError('current')}
                required
              />
              <Input
                label="New Password"
                isPassword
                placeholder="Enter your new password"
                value={newPassword}
                onChange={setNewPassword}
                error={getError('new')}
                required
              />
              <Input
                label="Confirm New Password"
                isPassword
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={getError('confirm')}
                required
              />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
                Update Password
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';