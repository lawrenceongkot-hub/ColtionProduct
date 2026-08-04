  export interface SplashProps {
  onComplete: () => void;
}

export interface LoadingProps {
  onComplete: () => void;
}

export interface AuthNavigation {
  onNavigate: (screen: 'login' | 'register' | 'auth') => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  referralCode?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'ultra';

export interface ResponsiveConfig {
  screenSize: ScreenSize;
  width: number;
  height: number;
  isLandscape: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  scaleFactor: number;
}

export interface User {
  id: string;
  displayId: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: number;
  invitationCode: string;
  invitationLink: string;
  invitedBy: string | null;
  referralCount: number;
  totalReferralEarnings: number;
  referrerAgentId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface VipPlan {
  id: number;
  name: string;
  buyAmount: number;
  dailyRate: number;
  dailyProfit: number;
  duration: number;
  totalReturn: number;
  badge: string;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  buttonText: string;
  gradient: string;
  illustration: string;
}

export interface InvestmentOrder {
  id: string;
  userId: string;
  vipLevel: number;
  vipName: string;
  vipBadge: string;
  buyAmount: number;
  dailyRate: number;
  dailyProfitPerDay: number;
  duration: number;
  totalReturn: number;
  purchaseDate: string;
  lastProfitDate: string;
  completedDays: number;
  currentProfit: number;
  status: 'active' | 'completed';
}

export interface OrderCalculated extends InvestmentOrder {
  displayProfit: number;
  displayCompletedDays: number;
  daysRemaining: number;
  displayStatus: 'active' | 'completed';
}

export interface ReferralStats {
  referralCount: number;
  totalEarnings: number;
  recentReferrals: ReferralEntry[];
  totalReferrals?: number;
  verifiedReferrals?: number;
  activeReferrals?: number;
  depositedReferrals?: number;
  totalDepositAmount?: number;
  totalCommissionEarned?: number;
  pendingCommission?: number;
  paidCommission?: number;
}

export interface ReferralEntry {
  id: string;
  fullName: string;
  email: string;
  joinedDate: string;
  status: 'active' | 'inactive';
  displayId?: string;
  referredUserId?: string;
  verificationStatus?: string;
  isVerified?: boolean;
  isActive?: boolean;
  hasDeposit?: boolean;
  totalDeposit?: number;
  totalWithdrawal?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'vip_purchase' | 'daily_profit' | 'referral_commission' | 'wallet_transfer' | 'vip_maturity_transfer' | 'welcome_bonus' | 'agent_commission' | 'admin_adjustment' | 'admin_deduction';
  amount: number;
  method: string;
  walletNumber?: string;
  reference: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  completedAt: string | null;
}

export interface EWallet {
  id: string;
  userId: string;
  provider: 'GCash' | 'Maya';
  walletNumber: string;
  withdrawalPassword: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  email: string;
  mobileNumber: string;
  verificationCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface RegistrationFingerprint {
  userId: string;
  fullName: string;
  ipAddress: string;
  deviceFingerprint: string;
  createdAt: string;
}

export interface WelcomeBonusClaim {
  id: string;
  userId: string;
  amount: number;
  ipAddress: string;
  deviceFingerprint: string;
  status: 'CLAIMED' | 'BLOCKED';
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  userId: string;
  agentCode: string;
  agentLink: string;
  totalCommission: number;
  totalReferrals: number;
  qualifiedDeposits: number;
  availableBalance: number;
}

export interface AgentReferral {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  registeredDate: string;
  firstDeposit: number | null;
  commission: number | null;
  status: 'waiting_deposit' | 'commission_paid';
  totalApprovedDeposits?: number;
  displayStatus?: 'waiting_deposit' | 'qualified';
}

export interface AgentCommission {
  id: string;
  agentId: string;
  referredUserId: string;
  referredName: string;
  depositAmount: number;
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
}

export interface AgentState {
  profile: AgentProfile | null;
  referrals: AgentReferral[];
  commissions: AgentCommission[];
}