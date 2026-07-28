import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GlassCard } from '../components/GlassCard';
import { colors, typography, borderRadius } from '../theme';
import { FIELD_VALIDATION } from '../constants';
import { useAuth } from '../context/AuthContext';
import type { AuthNavigation, RegisterFormData, ValidationError } from '../types';

interface RegisterScreenProps extends AuthNavigation {
  onBack?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = React.memo(({ onNavigate, onBack, onPrivacy, onTerms }) => {
  const { register } = useAuth();
  // Read referral code from URL if present
  const urlRefCode = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || '';
  }, []);

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    referralCode: urlRefCode || '',
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const getError = useCallback((field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  }, [errors]);

  const validateStep1 = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];

    if (!formData.fullName) {
      newErrors.push({ field: 'fullName', message: FIELD_VALIDATION.FULL_NAME.errorMessage.required });
    } else if (formData.fullName.length < FIELD_VALIDATION.FULL_NAME.minLength) {
      newErrors.push({ field: 'fullName', message: FIELD_VALIDATION.FULL_NAME.errorMessage.minLength });
    } else if (!FIELD_VALIDATION.FULL_NAME.pattern.test(formData.fullName)) {
      newErrors.push({ field: 'fullName', message: FIELD_VALIDATION.FULL_NAME.errorMessage.pattern });
    }

    if (!formData.email) {
      newErrors.push({ field: 'email', message: FIELD_VALIDATION.EMAIL.errorMessage.required });
    } else if (!FIELD_VALIDATION.EMAIL.pattern.test(formData.email)) {
      newErrors.push({ field: 'email', message: FIELD_VALIDATION.EMAIL.errorMessage.pattern });
    }

    if (!formData.phone) {
      newErrors.push({ field: 'phone', message: FIELD_VALIDATION.PHONE.errorMessage.required });
    } else if (!FIELD_VALIDATION.PHONE.pattern.test(formData.phone)) {
      newErrors.push({ field: 'phone', message: FIELD_VALIDATION.PHONE.errorMessage.pattern });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  const validateStep2 = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];

    if (!formData.password) {
      newErrors.push({ field: 'password', message: FIELD_VALIDATION.PASSWORD.errorMessage.required });
    } else if (formData.password.length < FIELD_VALIDATION.PASSWORD.minLength) {
      newErrors.push({ field: 'password', message: FIELD_VALIDATION.PASSWORD.errorMessage.minLength });
    } else if (!FIELD_VALIDATION.PASSWORD.pattern.test(formData.password)) {
      newErrors.push({ field: 'password', message: FIELD_VALIDATION.PASSWORD.errorMessage.pattern });
    }

    if (!formData.confirmPassword) {
      newErrors.push({ field: 'confirmPassword', message: FIELD_VALIDATION.CONFIRM_PASSWORD.errorMessage.required });
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.push({ field: 'confirmPassword', message: FIELD_VALIDATION.CONFIRM_PASSWORD.errorMessage.match });
    }

    if (!formData.agreeToTerms) {
      newErrors.push({ field: 'agreeToTerms', message: FIELD_VALIDATION.TERMS.errorMessage.required });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);

  const handleNextStep = useCallback(() => {
    if (validateStep1()) {
      setStep(2);
    }
  }, [validateStep1]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep();
      return;
    }
    if (!validateStep2()) return;

    setIsLoading(true);
    setAuthError(null);

    const referralCode = formData.referralCode || undefined;
    console.log('[DEBUG RegisterScreen] Submitting registration with:', {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      referralCode,
    });

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        referralCode,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log('[DEBUG RegisterScreen] Registration error:', errorMessage);
      setAuthError(errorMessage || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  }, [step, validateStep2, handleNextStep, register, formData]);

  const updateField = useCallback((field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(e => e.field !== field));
    setAuthError(null);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <ScreenLayout justifyContent="center">
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '100%',
            gap: 'clamp(16px, 2vh, 24px)',
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Header */}
          <motion.div
            style={{
              width: '100%',
              maxWidth: 'clamp(320px, 90vw, 480px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={() => {
                if (step === 2) {
                  setStep(1);
                } else {
                  onBack?.();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: colors.textSecondary,
                fontSize: typography.sm,
                fontFamily: typography.fontFamily,
                fontWeight: typography.medium,
                background: colors.bgGlass,
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: borderRadius.sm,
                padding: 'clamp(6px, 1vh, 8px) clamp(10px, 1.5vw, 14px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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

            {/* Step indicator */}
            <div style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}>
              {[1, 2].map((s) => (
                <div
                  key={s}
                  style={{
                    width: 'clamp(6px, 0.8vw, 8px)',
                    height: 'clamp(6px, 0.8vw, 8px)',
                    borderRadius: '50%',
                    background: s === step ? colors.primary : colors.borderDefault,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Register Card */}
          <GlassCard maxWidth="clamp(320px, 90vw, 480px)">
            <motion.form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(14px, 2vh, 20px)',
              }}
            >
              {/* Title */}
              <motion.h2
                key={step}
                style={{
                  fontSize: typography.xl,
                  fontWeight: typography.bold,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily,
                  textAlign: 'center',
                }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 ? 'Create Account' : 'Set Password'}
              </motion.h2>

              {/* Auth Error */}
              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div
                    style={{
                      padding: 'clamp(8px, 1.2vh, 12px) clamp(12px, 1.5vw, 16px)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: borderRadius.sm,
                      fontSize: typography.sm,
                      color: colors.error,
                      fontFamily: typography.fontFamily,
                      textAlign: 'center',
                      lineHeight: typography.snug,
                    }}
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'clamp(14px, 2vh, 20px)',
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Input
                      label="Full Name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(v) => updateField('fullName', v)}
                      error={getError('fullName')}
                      required
                      autoComplete="name"
                      name="fullName"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      }
                    />

                    <Input
                      label="Email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(v) => updateField('email', v)}
                      error={getError('email')}
                      required
                      autoComplete="email"
                      name="email"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      }
                    />

                    <Input
                      label="Mobile Number"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={formData.phone}
                      onChange={(v) => updateField('phone', v)}
                      error={getError('phone')}
                      required
                      autoComplete="tel"
                      name="phone"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      }
                    />

                    <Input
                      label="Invitation Code (optional)"
                      type="text"
                      placeholder="Enter invitation code"
                      value={formData.referralCode || ''}
                      onChange={(v) => updateField('referralCode', v)}
                      error={getError('referralCode')}
                      autoComplete="off"
                      name="referralCode"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      }
                    />

                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleNextStep}
                    >
                      Continue
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'clamp(14px, 2vh, 20px)',
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Input
                      label="Password"
                      isPassword
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(v) => updateField('password', v)}
                      error={getError('password')}
                      required
                      autoComplete="new-password"
                      name="password"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      }
                    />

                    <Input
                      label="Confirm Password"
                      isPassword
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={(v) => updateField('confirmPassword', v)}
                      error={getError('confirmPassword')}
                      required
                      autoComplete="new-password"
                      name="confirmPassword"
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          <circle cx="12" cy="16" r="1" />
                        </svg>
                      }
                    />

                    {/* Terms Checkbox */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: typography.sm,
                        color: getError('agreeToTerms') ? colors.error : colors.textSecondary,
                        fontFamily: typography.fontFamily,
                        lineHeight: typography.snug,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => updateField('agreeToTerms', e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: colors.primary,
                          cursor: 'pointer',
                          marginTop: '2px',
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        I agree to the{' '}
                        <button
                          type="button"
                          style={{
                            color: colors.primary,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 'inherit',
                            fontWeight: typography.semibold,
                            padding: 0,
                            fontFamily: typography.fontFamily,
                          }}
                          onClick={onPrivacy}
                        >
                          Privacy Policy
                        </button>
                        {' '}and{' '}
                        <button
                          type="button"
                          style={{
                            color: colors.primary,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 'inherit',
                            fontWeight: typography.semibold,
                            padding: 0,
                            fontFamily: typography.fontFamily,
                          }}
                          onClick={onTerms}
                        >
                          Terms
                        </button>
                      </span>
                    </label>
                    {getError('agreeToTerms') && (
                      <p style={{
                        fontSize: typography.xs,
                        color: colors.error,
                        marginTop: '-8px',
                        fontFamily: typography.fontFamily,
                      }}>
                        {getError('agreeToTerms')}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={isLoading}
                    >
                      Create Account
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Link */}
              <motion.div
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                  marginTop: 'clamp(4px, 0.5vh, 8px)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <span style={{
                  fontSize: typography.sm,
                  color: colors.textTertiary,
                  fontFamily: typography.fontFamily,
                }}>
                  Already have an account?
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  style={{
                    fontSize: typography.sm,
                    color: colors.primary,
                    fontFamily: typography.fontFamily,
                    fontWeight: typography.semibold,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.primaryLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.primary; }}
                >
                  Login
                </button>
              </motion.div>
            </motion.form>
          </GlassCard>
        </motion.div>
      </ScreenLayout>
    </AnimatePresence>
  );
});

RegisterScreen.displayName = 'RegisterScreen';