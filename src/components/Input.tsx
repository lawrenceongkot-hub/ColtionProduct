import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  className?: string;
  maxLength?: number;
  name?: string;
}

export const Input: React.FC<InputProps> = React.memo(({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  error,
  disabled = false,
  required = false,
  autoComplete,
  icon,
  isPassword = false,
  className = '',
  maxLength,
  name,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responsive = useResponsive();

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasValue = value.length > 0;
  const isActive = isFocused || hasValue;

  return (
    <motion.div
      className={className}
      style={{
        width: '100%',
        position: 'relative',
        transform: `scale(${responsive.scaleFactor})`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Label */}
      <motion.label
        style={{
          display: 'block',
          fontSize: typography.sm,
          fontWeight: typography.medium,
          color: isActive ? colors.primary : colors.textTertiary,
          marginBottom: 'clamp(4px, 0.8vh, 8px)',
          fontFamily: typography.fontFamily,
          transition: 'color 0.2s ease',
        }}
        animate={{ color: isActive ? colors.primary : colors.textTertiary }}
      >
        {label}
        {required && (
          <span style={{ color: colors.error, marginLeft: '2px' }}>*</span>
        )}
      </motion.label>

      {/* Input Container */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 1vw, 12px)',
          padding: `clamp(10px, 1.8vh, 14px) clamp(12px, 1.5vw, 16px)`,
          background: colors.bgGlassLight,
          border: `1.5px solid ${error ? colors.error : isFocused ? colors.borderFocused : colors.borderDefault}`,
          borderRadius: borderRadius.md,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isFocused
            ? `0 0 0 3px rgba(0, 102, 255, 0.1), ${error ? `0 0 0 3px rgba(239, 68, 68, 0.1)` : ''}`
            : 'none',
        }}
        animate={{
          borderColor: error ? colors.error : isFocused ? colors.borderFocused : colors.borderDefault,
          boxShadow: isFocused
            ? `0 0 0 3px rgba(0, 102, 255, 0.1)`
            : 'none',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Icon */}
        {icon && (
          <motion.span
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              color: isFocused ? colors.primary : colors.textTertiary,
              transition: 'color 0.2s ease',
            }}
            animate={{ color: isFocused ? colors.primary : colors.textTertiary }}
          >
            {icon}
          </motion.span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          name={name}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          style={{
            flex: 1,
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.textPrimary,
            fontSize: typography.base,
            fontWeight: typography.regular,
            fontFamily: typography.fontFamily,
            lineHeight: typography.normal,
            minHeight: 'clamp(18px, 2.5vh, 24px)',
          }}
          // iOS fix: prevent zoom on focus
          data-zoom="false"
        />

        {/* Password Toggle */}
        {isPassword && hasValue && (
          <motion.button
            type="button"
            onClick={togglePassword}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: colors.textTertiary,
            }}
            whileHover={{ color: colors.textSecondary }}
            whileTap={{ scale: 0.9 }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </motion.button>
        )}
      </motion.div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            style={{
              fontSize: typography.xs,
              color: colors.error,
              marginTop: 'clamp(4px, 0.6vh, 6px)',
              fontFamily: typography.fontFamily,
              fontWeight: typography.regular,
              lineHeight: typography.snug,
            }}
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

Input.displayName = 'Input';