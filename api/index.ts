/**
 * Vercel Serverless Function Entry Point
 * 
 * Standalone Express app for Vercel's serverless environment.
 * Reuses route handlers from server/src/routes but avoids Socket.IO.
 */
import express from 'express';
import cors from 'cors';
import { authRouter } from '../server/src/routes/auth';
import { adminRouter } from '../server/src/routes/admin';
import { walletRouter } from '../server/src/routes/wallet';
import { depositRouter } from '../server/src/routes/deposit';
import { withdrawalRouter } from '../server/src/routes/withdrawal';
import { orderRouter } from '../server/src/routes/order';
import { transactionRouter } from '../server/src/routes/transaction';
import { referralRouter } from '../server/src/routes/referral';
import { settingsRouter } from '../server/src/routes/settings';
import { userRouter } from '../server/src/routes/user';
import { verificationRouter } from '../server/src/routes/verification';
import { agentRouter } from '../server/src/routes/agent';
import { ewalletRouter } from '../server/src/routes/ewallet';
import { dashboardRouter } from '../server/src/routes/dashboard';
import { adminAgentsRouter } from '../server/src/routes/adminAgents';
import { authenticateToken } from '../server/src/middleware/auth';

const app = express();

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app',
  'https://coltionproduct.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);

// Protected routes
app.use('/api/wallet', authenticateToken, walletRouter);
app.use('/api/deposits', authenticateToken, depositRouter);
app.use('/api/withdrawals', authenticateToken, withdrawalRouter);
app.use('/api/orders', authenticateToken, orderRouter);
app.use('/api/transactions', authenticateToken, transactionRouter);
app.use('/api/referrals', authenticateToken, referralRouter);
app.use('/api/users', authenticateToken, userRouter);
app.use('/api/verification', authenticateToken, verificationRouter);
app.use('/api/agents', authenticateToken, agentRouter);
app.use('/api/ewallets', authenticateToken, ewalletRouter);
app.use('/api/dashboard', authenticateToken, dashboardRouter);

// Admin routes
app.use('/api/admin', adminRouter);
app.use('/api/admin/agents', authenticateToken, adminAgentsRouter);

export default app;