/**
 * Vercel Serverless Function - Complete Express app for ALL routes
 * 
 * Uses raw Vercel handler approach - Express app is created outside
 * the handler for cold start optimization, and we manually route
 * requests through Express.
 */
import express from 'express';

// ============================================================
// Build the Express app once at module level (cold start)
// ============================================================
const app = express();

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// ============================================================
// HEALTH CHECK - No dependencies
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// ALL OTHER ROUTES are handled by the catch-all
// ============================================================
app.all('/api/*', async (req, res) => {
  try {
    // Lazy load Prisma, bcrypt, jwt only when needed
    const { PrismaClient } = await import('@prisma/client');
    const bcrypt = await import('bcryptjs');
    const jwt = await import('jsonwebtoken');

    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    const { fullName, email, phone, password, referralCode } = req.body || {};
    const { path: p, method: m } = req;

    // ============================================================
    // POST /api/auth/register
    // ============================================================
    if (m === 'POST' && p === '/api/auth/register') {
      if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existing) return res.status(400).json({ error: 'Email is already registered.' });

      const phoneExists = await prisma.user.findFirst({ where: { phone } });
      if (phoneExists) return res.status(400).json({ error: 'Mobile number is already registered.' });

      const hashed = await bcrypt.hash(password, 12);
      const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
      const invCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const baseUrl = process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app';

      const user = await prisma.user.create({
        data: {
          displayId, email: email.toLowerCase().trim(), password: hashed,
          fullName, phone, invitationCode: invCode,
          invitationLink: `${baseUrl}/register?ref=${invCode}`,
          referralCount: 0, totalReferralEarnings: 0,
        },
      });

      await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });

      const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });

      return res.status(201).json({
        user: { id: user.id, displayId, fullName, email, phone, invitationCode: invCode, createdAt: user.createdAt },
        accessToken, refreshToken,
      });
    }

    // ============================================================
    // POST /api/auth/login
    // ============================================================
    if (m === 'POST' && p === '/api/auth/login') {
      const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
      if (!user) return res.status(400).json({ error: 'No account found' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: 'Incorrect password' });
      const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });
      return res.json({
        user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, referralCount: user.referralCount, totalReferralEarnings: user.totalReferralEarnings, picture: user.picture, createdAt: user.createdAt },
        accessToken, refreshToken,
      });
    }

    // ============================================================
    // POST /api/auth/google
    // ============================================================
    if (m === 'POST' && p === '/api/auth/google') {
      const { googleId, fullName, picture } = req.body;
      if (!googleId || !email || !fullName) return res.status(400).json({ error: 'Missing Google data' });
      let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });
      let isNew = false;
      if (!user) {
        const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
        const invCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const baseUrl = process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app';
        user = await prisma.user.create({
          data: { displayId, email: email.toLowerCase().trim(), password: 'google_' + Date.now(), fullName, phone: '', picture: picture || '', googleId, invitationCode: invCode, invitationLink: `${baseUrl}/register?ref=${invCode}`, referralCount: 0, totalReferralEarnings: 0 },
        });
        await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
        isNew = true;
      }
      const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });
      return res.json({ user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt }, accessToken, refreshToken, isNew });
    }

    // ============================================================
    // POST /api/auth/logout
    // ============================================================
    if (m === 'POST' && p === '/api/auth/logout') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
          await prisma.userSession.deleteMany({ where: { userId: decoded.id } });
        } catch {}
      }
      return res.json({ success: true });
    }

    // ============================================================
    // POST /api/auth/refresh
    // ============================================================
    if (m === 'POST' && p === '/api/auth/refresh') {
      const { refreshToken: rt } = req.body;
      if (!rt) return res.status(400).json({ error: 'Refresh token required' });
      try {
        const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET || 'fallback-r');
        const session = await prisma.userSession.findFirst({ where: { refreshToken: rt, userId: decoded.id } });
        if (!session) return res.status(403).json({ error: 'Invalid refresh token' });
        const tokens = {
          accessToken: jwt.sign({ id: decoded.id, email: decoded.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' }),
          refreshToken: jwt.sign({ id: decoded.id, email: decoded.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' }),
        };
        await prisma.userSession.update({ where: { id: session.id }, data: { token: tokens.accessToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        return res.json(tokens);
      } catch {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
    }

    // ============================================================
    // GET /api/auth/me
    // ============================================================
    if (m === 'GET' && p === '/api/auth/me') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Token required' });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, displayId: true, fullName: true, email: true, phone: true, invitationCode: true, invitationLink: true, invitedBy: true, referralCount: true, totalReferralEarnings: true, picture: true, googleId: true, createdAt: true, wallet: { select: { main: true, semWallet: true, ongoing: true } } },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
      } catch {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }

    // ============================================================
    // GET /api/auth/check
    // ============================================================
    if (m === 'GET' && p === '/api/auth/check') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (!token) return res.json({ authenticated: false });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, fullName: true } });
        if (!user) return res.json({ authenticated: false });
        return res.json({ authenticated: true, user });
      } catch {
        return res.json({ authenticated: false });
      }
    }

    // ============================================================
    // GET /api/wallet
    // ============================================================
    if (m === 'GET' && p === '/api/wallet') {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Token required' });
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        const wallet = await prisma.wallet.findUnique({ where: { userId: decoded.id } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        return res.json(wallet);
      } catch {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }

    // ============================================================
    // GET /api/settings
    // ============================================================
    if (m === 'GET' && p === '/api/settings') {
      const settings = await prisma.platformSettings.findFirst();
      return res.json(settings || {});
    }

    // ============================================================
    // DEFAULT: Route not found
    // ============================================================
    return res.status(404).json({ error: 'Route not found', path: p, method: m });

  } catch (error) {
    console.error('=== API ERROR:', error?.message || error, '===');
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }
});

// ============================================================
// SPA FALLBACK - Serve index.html for non-API routes
// ============================================================
// This is handled by vercel.json rewrites

// ============================================================
// VERCEL SERVERLESS HANDLER
// ============================================================
export default async function handler(req, res) {
  // Let Express handle all API routes
  app(req, res);
}