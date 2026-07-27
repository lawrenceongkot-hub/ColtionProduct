import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenLayout } from '../layouts/ScreenLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GlassCard } from '../components/GlassCard';
import { colors, typography, borderRadius } from '../theme';
import { FIELD_VALIDATION } from '../constants';
import { useAuth } from '../context/AuthContext';
import type { AuthNavigation, LoginFormData, ValidationError } from '../types';

interface LoginScreenProps extends AuthNavigation {
  onBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = React.memo(({ onNavigate, onBack }) => {
  const { login } = useAuth();
  const [loginBlocked, setLoginBlocked] = React.useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const getError = useCallback((field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationError[] = [];

    if (!formData.email) {
      newErrors.push({ field: 'email', message: FIELD_VALIDATION.EMAIL.errorMessage.required });
    } else if (!FIELD_VALIDATION.EMAIL.pattern.test(formData.email)) {
      newErrors.push({ field: 'email', message: FIELD_VALIDATION.EMAIL.errorMessage.pattern });
    }

    if (!formData.password) {
      newErrors.push({ field: 'password', message: FIELD_VALIDATION.PASSWORD.errorMessage.required });
    }

    setErrors(newErrors);
    if (newErrors.length === 0) setAuthError(null);
    return newErrors.length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthError(null);

    try {
      await login(formData.email, formData.password, formData.rememberMe);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  }, [validateForm, login, formData]);

  const updateField = useCallback((field: keyof LoginFormData, value: string | boolean) => {
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
              onClick={() => onBack?.()}
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
          </motion.div>

          {/* Login Card */}
          <GlassCard maxWidth="clamp(320px, 90vw, 480px)">
            <motion.form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(16px, 2.5vh, 24px)',
              }}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, delayChildren: 0.1 },
                },
              }}
            >
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

              {/* Title */}
              <motion.h2
                style={{
                  fontSize: typography.xl,
                  fontWeight: typography.bold,
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily,
                  textAlign: 'center',
                }}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                Welcome Back
              </motion.h2>

              {/* Email */}
              <motion.div variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}>
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
              </motion.div>

              {/* Password */}
              <motion.div variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}>
                <Input
                  label="Password"
                  isPassword
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(v) => updateField('password', v)}
                  error={getError('password')}
                  required
                  autoComplete="current-password"
                  name="password"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                />
              </motion.div>

              {/* Remember Me & Forgot Password */}
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.4 } },
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: typography.sm,
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => updateField('rememberMe', e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: colors.primary,
                      cursor: 'pointer',
                    }}
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  style={{
                    fontSize: typography.sm,
                    color: colors.primary,
                    fontFamily: typography.fontFamily,
                    fontWeight: typography.medium,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.primaryLight; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.primary; }}
                >
                  Forgot Password?
                </button>
              </motion.div>

              {/* Login Button */}
              <motion.div variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                >
                  Login
                </Button>
              </motion.div>

              {/* Divider */}
              <motion.div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(8px, 1.5vw, 16px)',
                  width: '100%',
                }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.4 } },
                }}
              >
                <div style={{ flex: 1, height: '1px', background: colors.borderDefault }} />
                <span style={{
                  fontSize: typography.sm,
                  color: colors.textTertiary,
                  fontFamily: typography.fontFamily,
                  whiteSpace: 'nowrap',
                }}>
                  OR
                </span>
                <div style={{ flex: 1, height: '1px', background: colors.borderDefault }} />
              </motion.div>

              {/* Google Login */}
              <motion.div variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => {}}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  }
                >
                  Continue with Google
                </Button>
              </motion.div>

              {/* Register Link */}
              <motion.div
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '4px',
                  flexWrap: 'wrap',
                }}
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.4 } },
                }}
              >
                <span style={{
                  fontSize: typography.sm,
                  color: colors.textTertiary,
                  fontFamily: typography.fontFamily,
                }}>
                  Don't have an account?
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
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
                  Sign Up
                </button>
              </motion.div>
            </motion.form>
          </GlassCard>
        </motion.div>
      </ScreenLayout>
    </AnimatePresence>
  );
});

LoginScreen.displayName = 'LoginScreen';