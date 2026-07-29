/**
 * Vercel Serverless Function - Standalone Express app
 * Imports route handlers directly, avoids Socket.IO
 */
import express from 'express';
import cors from 'cors';
import { authRouter } from '../server/src/routes/auth';
import { settingsRouter } from '../server/src/routes/settings';
import { authenticateToken } from '../server/src/middleware/auth';

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app',
  'https://coltionproduct.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin: any, callback: any) => callback(null, true),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);

export default app;