export const APP_NAME = 'Coltion Product';
export const APP_TAGLINE = 'Invest Securely. Grow Confidently.';
export const APP_VERSION = 'v1.0.0';

export const SPLASH_DURATION = 2000;
export const LOADING_DURATION = 5000;
export const LOADING_INTERVAL = 50;

export const LOADING_MESSAGES = [
  'Initializing Secure Platform...',
  'Loading Investment Services...',
  'Connecting Secure Network...',
  'Verifying Platform Security...',
  'Starting Coltion Product...',
] as const;

export const LOADING_MESSAGE_THRESHOLDS = [
  { percent: 0, messageIndex: 0 },
  { percent: 20, messageIndex: 0 },
  { percent: 40, messageIndex: 1 },
  { percent: 60, messageIndex: 2 },
  { percent: 80, messageIndex: 3 },
  { percent: 100, messageIndex: 4 },
] as const;

export const AUTH_ROUTES = {
  SPLASH: '/',
  LOADING: '/loading',
  AUTH: '/auth',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export const FIELD_VALIDATION = {
  FULL_NAME: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    errorMessage: {
      required: 'Full name is required',
      minLength: 'Name must be at least 2 characters',
      maxLength: 'Name must be less than 50 characters',
      pattern: 'Name contains invalid characters',
    },
  },
  EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: {
      required: 'Email is required',
      pattern: 'Please enter a valid email address',
    },
  },
  PHONE: {
    required: true,
    pattern: /^\+?[\d\s-()]{7,15}$/,
    errorMessage: {
      required: 'Mobile number is required',
      pattern: 'Please enter a valid mobile number',
    },
  },
  PASSWORD: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    errorMessage: {
      required: 'Password is required',
      minLength: 'Password must be at least 8 characters',
      maxLength: 'Password must be less than 128 characters',
      pattern: 'Password must contain uppercase, lowercase, and number',
    },
  },
  CONFIRM_PASSWORD: {
    required: true,
    errorMessage: {
      required: 'Please confirm your password',
      match: 'Passwords do not match',
    },
  },
  TERMS: {
    required: true,
    errorMessage: {
      required: 'You must agree to the terms and conditions',
    },
  },
} as const;

export const ANIMATION_CONFIG = {
  splash: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  loading: { progressDuration: 10, ease: 'linear' },
  fadeIn: { duration: 0.6, ease: 'easeOut' },
  slideUp: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  stagger: {
    container: { staggerChildren: 0.08, delayChildren: 0.2 },
    item: { y: 20, opacity: 0 },
    itemVisible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  },
  button: { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, transition: { type: 'spring', stiffness: 400, damping: 17 } },
  input: { focus: { scale: 1.01 }, transition: { duration: 0.2 } },
} as const;

export const VIP_PLANS = [
  { id: 0, name: 'VIP 0', buyAmount: 200, dailyRate: 65, dailyProfit: 130, duration: 30, totalReturn: 3900, badge: 'Starter' },
  { id: 1, name: 'VIP 1', buyAmount: 500, dailyRate: 66, dailyProfit: 330, duration: 30, totalReturn: 9900, badge: 'Bronze' },
  { id: 2, name: 'VIP 2', buyAmount: 1000, dailyRate: 60, dailyProfit: 600, duration: 30, totalReturn: 18000, badge: 'Silver' },
  { id: 3, name: 'VIP 3', buyAmount: 2000, dailyRate: 65, dailyProfit: 1300, duration: 30, totalReturn: 39000, badge: 'Gold' },
  { id: 4, name: 'VIP 4', buyAmount: 5000, dailyRate: 70, dailyProfit: 3500, duration: 30, totalReturn: 105000, badge: 'Platinum' },
  { id: 5, name: 'VIP 5', buyAmount: 10000, dailyRate: 75, dailyProfit: 7500, duration: 30, totalReturn: 225000, badge: 'Diamond' },
  { id: 6, name: 'VIP 6', buyAmount: 20000, dailyRate: 80, dailyProfit: 16000, duration: 30, totalReturn: 480000, badge: 'Elite' },
  { id: 7, name: 'VIP 7', buyAmount: 50000, dailyRate: 85, dailyProfit: 42500, duration: 30, totalReturn: 1275000, badge: 'Premium' },
  { id: 8, name: 'VIP 8', buyAmount: 100000, dailyRate: 90, dailyProfit: 90000, duration: 30, totalReturn: 2700000, badge: 'Luxury' },
  { id: 9, name: 'VIP 9', buyAmount: 200000, dailyRate: 95, dailyProfit: 190000, duration: 30, totalReturn: 5700000, badge: 'Royal' },
  { id: 10, name: 'VIP 10', buyAmount: 500000, dailyRate: 100, dailyProfit: 500000, duration: 30, totalReturn: 15000000, badge: 'Exclusive' },
] as const;

export const HERO_SLIDES = [
  {
    id: 1,
    title: 'Welcome to Coltion Product',
    subtitle: 'Invest smarter with a secure and modern investment platform designed to help grow your financial future.',
    buttonText: 'Start Investing',
    gradient: 'linear-gradient(135deg, #0A0E1A 0%, #0033CC 40%, #0066FF 70%, #0A0E1A 100%)',
    illustration: 'chart-up',
  },
  {
    id: 2,
    title: 'Grow Your Wealth',
    subtitle: 'Choose the investment plan that matches your financial goals and earn daily returns with confidence.',
    buttonText: 'Explore VIP Plans',
    gradient: 'linear-gradient(135deg, #0A0E1A 0%, #0047CC 40%, #00B4D8 70%, #0A0E1A 100%)',
    illustration: 'growth',
  },
  {
    id: 3,
    title: 'Secure. Reliable. Professional.',
    subtitle: 'Experience a trusted investment platform with a premium user experience, advanced security, and intelligent financial management.',
    buttonText: 'Join Now',
    gradient: 'linear-gradient(135deg, #0A0E1A 0%, #1A3A6B 40%, #0047CC 70%, #0A0E1A 100%)',
    illustration: 'security',
  },
] as const;

export const FORMAT_CURRENCY = (amount: number): string => {
  return '₱' + amount.toLocaleString('en-PH');
};

export const FORMAT_PERCENT = (rate: number): string => {
  return rate + '%';
};