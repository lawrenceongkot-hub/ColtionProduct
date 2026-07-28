import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { walletRouter } from './routes/wallet.js';
import { depositRouter } from './routes/deposit.js';
import { withdrawalRouter } from './routes/withdrawal.js';
import { orderRouter } from './routes/order.js';
import { transactionRouter } from './routes/transaction.js';
import { referralRouter } from './routes/referral.js';
import { settingsRouter } from './routes/settings.js';
import { userRouter } from './routes/user.js';
import { verificationRouter } from './routes/verification.js';
import { agentRouter } from './routes/agent.js';
import { ewalletRouter } from './routes/ewallet.js';
import { dashboardRouter } from './routes/dashboard.js';
import { adminAgentsRouter } from './routes/adminAgents.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://coltionproduct.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Root
app.get('/', (_req: express.Request, res: express.Response) => {
  res.json({ name: 'Coltion API', version: '1.0.0', status: 'running' });
});

// Health check
app.get('/api/health', (_req: express.Request, res: express.Response) => {
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
app.get('/api/debug/routes', (_req: express.Request, res: express.Response) => {
  const routeList: string[] = [];
  const printRoutes = (stack: any[], basePath: string = '') => {
    stack?.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routeList.push(`${methods} ${basePath}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // Get the path from the regexp
        let routerPath = '';
        if (layer.regexp) {
          const match = layer.regexp.toString().match(/\/\^\\\?(.*?)\\\/\?\$\/i/);
          if (match) {
            routerPath = '/' + match[1].replace(/\\\//g, '/').replace(/\(\?:\(\[\^\\\/\]\?\)\?\)/g, ':param');
          }
        }
        printRoutes(layer.handle.stack, routerPath);
      }
    });
  };
  printRoutes(app._router?.stack || []);
  res.json({ routes: routeList.sort(), count: routeList.length });
});

export default app;

// Socket.IO for local dev
const httpServer = createServer(app);
export const io = new SocketIOServer();
io.attach(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join:user', (userId: string) => socket.join(`user:${userId}`));
  socket.on('join:admin', () => socket.join('admin'));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = parseInt(process.env.PORT || '3001');
if (process.env.VERCEL !== '1') {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
}

process.on('SIGTERM', () => {
  httpServer.close();
  process.exit(0);
});