export const colors = {
  // Primary
  primary: '#0066FF',
  primaryLight: '#3388FF',
  primaryDark: '#0044CC',
  primaryGradientStart: '#0033CC',
  primaryGradientEnd: '#0066FF',

  // Accent
  accent: '#00D4FF',
  accentLight: '#66E5FF',
  accentDark: '#0099CC',

  // Backgrounds
  bgPrimary: '#0A0E1A',
  bgSecondary: '#111827',
  bgTertiary: '#1A2235',
  bgCard: 'rgba(26, 34, 53, 0.8)',
  bgGlass: 'rgba(255, 255, 255, 0.05)',
  bgGlassLight: 'rgba(255, 255, 255, 0.08)',
  bgGlassMedium: 'rgba(255, 255, 255, 0.12)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B8C9',
  textTertiary: '#6B7280',
  textMuted: '#4B5563',

  // Borders
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderFocused: 'rgba(0, 102, 255, 0.5)',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  // Gradient
  gradientDark: 'linear-gradient(135deg, #0A0E1A 0%, #1A2235 50%, #0A0E1A 100%)',
  gradientBlue: 'linear-gradient(135deg, #0033CC 0%, #0066FF 50%, #00D4FF 100%)',
  gradientCard: 'linear-gradient(135deg, rgba(0, 51, 204, 0.15) 0%, rgba(0, 102, 255, 0.1) 50%, rgba(0, 212, 255, 0.05) 100%)',
  gradientGlass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
  huge: '96px',
};

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  full: '9999px',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",

  // Font sizes using clamp for responsiveness
  xs: 'clamp(0.625rem, 1.5vw, 0.75rem)',
  sm: 'clamp(0.75rem, 1.8vw, 0.875rem)',
  base: 'clamp(0.875rem, 2vw, 1rem)',
  md: 'clamp(1rem, 2.2vw, 1.125rem)',
  lg: 'clamp(1.125rem, 2.5vw, 1.25rem)',
  xl: 'clamp(1.25rem, 3vw, 1.5rem)',
  xxl: 'clamp(1.5rem, 3.5vw, 2rem)',
  xxxl: 'clamp(2rem, 4.5vw, 2.5rem)',
  huge: 'clamp(2.5rem, 6vw, 3.5rem)',
  massive: 'clamp(3rem, 8vw, 5rem)',

  // Font weights
  thin: 100,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,

  // Line heights
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
};

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
  md: '0 4px 16px rgba(0, 0, 0, 0.25)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.35)',
  glow: '0 0 20px rgba(0, 102, 255, 0.3)',
  glowStrong: '0 0 40px rgba(0, 102, 255, 0.4)',
  glowAccent: '0 0 20px rgba(0, 212, 255, 0.2)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
};

export const breakpoints = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1440,
  ultra: 1920,
};

export const zIndex = {
  base: 1,
  dropdown: 100,
  modal: 200,
  overlay: 300,
  toast: 400,
  loading: 500,
  splash: 600,
};

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  breakpoints,
  zIndex,
};

export default theme;