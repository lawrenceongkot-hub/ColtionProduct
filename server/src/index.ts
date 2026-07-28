import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
console.log('Registering auth routes...');
app.use('/api/auth', authRouter);
console.log('Registering settings routes...');
app.use('/api/settings', settingsRouter);

// Protected routes
console.log('Registering protected routes...');
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
console.log('Registering admin routes...');
app.use('/api/admin', adminRouter);
app.use('/api/admin/agents', authenticateToken, adminAgentsRouter);

console.log('ALL ROUTES REGISTERED');

// Route debug - simple approach
app.get('/api/debug/routes', (_req: express.Request, res: express.Response) => {
  const routes: string[] = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push(`${methods} ${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        // Get the mount path from the regexp
        let mountPath = '';
        if (layer.regexp) {
          const str = layer.regexp.toString();
          // Extract path from regex like /^\/api\/auth\/?(?=\/|$)/i
          const match = str.match(/\/\^\\\?(.*?)\\\/\?/);
          if (match) {
            mountPath = match[1].replace(/\\\//g, '/');
          }
        }
        layer.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            routes.push(`${methods} ${mountPath}${handler.route.path}`);
          }
        });
      }
    });
  }
  res.json({ routes: routes.sort(), count: routes.length });
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