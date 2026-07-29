import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { walletRouter } from './routes/wallet';
import { depositRouter } from './routes/deposit';
import { withdrawalRouter } from './routes/withdrawal';
import { orderRouter } from './routes/order';
import { transactionRouter } from './routes/transaction';
import { referralRouter } from './routes/referral';
import { settingsRouter } from './routes/settings';
import { userRouter } from './routes/user';
import { verificationRouter } from './routes/verification';
import { agentRouter } from './routes/agent';
import { ewalletRouter } from './routes/ewallet';
import { dashboardRouter } from './routes/dashboard';
import { adminAgentsRouter } from './routes/adminAgents';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();

// CORS - Allow all origins in production
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// HEALTH CHECK - Must respond immediately, no dependencies
// ============================================================
app.get('/api/health', (_req, res) => {
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

// Route debug
const ROUTE_LIST = [
  'GET /api/health',
  'GET /api/settings',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/google',
  'GET /api/auth/me',
  'GET /api/wallet',
  'POST /api/deposits',
  'POST /api/withdrawals',
  'POST /api/orders/purchase',
  'GET /api/orders',
  'GET /api/transactions',
  'GET /api/referrals',
  'PUT /api/users/profile',
  'PUT /api/users/password',
  'POST /api/verification',
  'POST /api/verification/verify',
  'GET /api/agents/profile',
  'GET /api/agents/referrals',
  'GET /api/agents/commissions',
  'GET/POST/DELETE /api/ewallets',
  'GET /api/dashboard',
  'POST /api/admin/login',
  'GET /api/admin/dashboard',
  'GET /api/admin/users',
  'GET /api/admin/deposits',
  'GET /api/admin/withdrawals',
  'GET /api/admin/orders',
  'GET /api/admin/transactions',
  'GET /api/admin/verifications',
  'GET/PUT /api/admin/settings',
  'GET/PUT /api/admin/agents/*',
];

app.get('/api/debug/routes', (_req, res) => {
  res.json({ routes: ROUTE_LIST, count: ROUTE_LIST.length });
});

// ============================================================
// FALLBACK 404 handler
// ============================================================
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================================
// Global error handler
// ============================================================
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('=== GLOBAL ERROR:', err?.message || err, '===');
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

// ============================================================
// Socket.IO - Only for local dev, NOT in Vercel serverless
// ============================================================
if (process.env.VERCEL !== '1') {
  const { createServer } = require('http');
  const { Server: SocketIOServer } = require('socket.io');
  const httpServer = createServer(app);
  const io = new SocketIOServer();
  io.attach(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });
  io.on('connection', (socket: any) => {
    console.log('Client connected:', socket.id);
    socket.on('join:user', (userId: string) => socket.join(`user:${userId}`));
    socket.on('join:admin', () => socket.join('admin'));
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  const PORT = parseInt(process.env.PORT || '3001');
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });

  process.on('SIGTERM', () => {
    httpServer.close();
    process.exit(0);
  });
}