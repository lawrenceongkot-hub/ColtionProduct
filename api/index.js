/**
 * Vercel Serverless Function - Self-contained Express app
 * ESM version - matches root package.json "type": "module"
 * 
 * FIX: Health check works WITHOUT any dependencies (no Prisma, no bcrypt, no jwt).
 * FIX: Lazy PrismaClient with proper error handling.
 * FIX: wrapHandler with timeout to prevent hanging requests.
 */
import express from 'express';
import cors from 'cors';

console.log('=== SERVER START ===');

// ============================================================
// LAZY IMPORTS - Only load when needed to avoid cold start crashes
// ============================================================
let prisma = null;
let bcrypt = null;
let jwt = null;

async function ensurePrisma() {
  if (!prisma) {
    console.log('=== LOADING PRISMA CLIENT ===');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required but was not found.');
    }
    try {
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient();
      console.log('=== PRISMA CLIENT CREATED ===');
    } catch (err) {
      console.error('=== PRISMA CLIENT FAILED TO LOAD:', err?.message, '===');
      throw err;
    }
  }
  return prisma;
}

async function ensureBcrypt() {
  if (!bcrypt) {
    bcrypt = await import('bcryptjs');
  }
  return bcrypt;
}

async function ensureJwt() {
  if (!jwt) {
    jwt = await import('jsonwebtoken');
  }
  return jwt;
}

const app = express();
console.log('=== EXPRESS APP CREATED ===');

app.use(cors({ origin: () => true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

console.log('=== MIDDLEWARE REGISTERED ===');

// ============================================================
// IMMEDIATE RESPONSE WRAPPER
// ============================================================
function wrapHandler(fn) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`=== TIMEOUT: ${req.method} ${req.path} timed out ===`);
        res.status(504).json({ error: 'Request timeout', path: req.path });
      }
    }, 25000);

    const done = () => clearTimeout(timeout);
    res.on('finish', done);
    res.on('close', done);
    res.on('error', done);

    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch(err => {
          clearTimeout(timeout);
          console.error(`=== ASYNC ERROR in ${req.method} ${req.path}:`, err?.message || err, '===');
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error', path: req.path });
          }
        });
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error(`=== SYNC ERROR in ${req.method} ${req.path}:`, err?.message || err, '===');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', path: req.path });
      }
    }
  };
}

// ============================================================
// HEALTH CHECK - Pure sync, no dependencies, instant response
// ============================================================
app.get('/api/health', wrapHandler((_req, res) => {
  console.log('=== /api/health CALLED ===');
  res.status(200).json({
    status: 'ok',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    server: 'running',
    timestamp: new Date().toISOString(),
  });
  console.log('=== /api/health RESPONSE SENT ===');
}));

// ============================================================
// REGISTER
// ============================================================
app.post('/api/auth/register', wrapHandler(async (req, res) => {
  console.log('=== REGISTER: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const jw = await ensureJwt();
    
    const { fullName, email, phone, password } = req.body;
    console.log('=== REGISTER: BODY RECEIVED ===', { fullName: !!fullName, email: !!email, phone: !!phone, password: !!password });

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields: fullName, email, phone, password' });
    }

    const existing = await p.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bc.hash(password, 12);
    const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
    const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const user = await p.user.create({
      data: {
        displayId,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName,
        phone,
        invitationCode,
        invitationLink: `${process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app'}/register?ref=${invitationCode}`,
        referralCount: 0,
        totalReferralEarnings: 0,
      },
    });

    await p.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });

    const accessToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

    res.status(201).json({
      user: { id: user.id, displayId, fullName, email, phone, invitationCode, createdAt: user.createdAt },
      accessToken,
      refreshToken,
    });
    console.log('=== REGISTER: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== REGISTER ERROR:', error?.message || error, '===');
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
}));

// ============================================================
// LOGIN
// ============================================================
app.post('/api/auth/login', wrapHandler(async (req, res) => {
  console.log('=== LOGIN: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const jw = await ensureJwt();
    
    const { email, password } = req.body;

    const user = await p.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
    if (!user) {
      return res.status(400).json({ error: 'No account found with this email address.' });
    }

    const valid = await bc.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    const accessToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

    res.json({
      user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, createdAt: user.createdAt },
      accessToken,
      refreshToken,
    });
    console.log('=== LOGIN: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== LOGIN ERROR:', error?.message || error, '===');
    res.status(500).json({ error: 'Login failed' });
  }
}));

// ============================================================
// GOOGLE AUTH
// ============================================================
app.post('/api/auth/google', wrapHandler(async (req, res) => {
  console.log('=== GOOGLE: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const jw = await ensureJwt();
    
    const { googleId, email, fullName, picture } = req.body;
    if (!googleId || !email || !fullName) {
      return res.status(400).json({ error: 'Missing required Google user data' });
    }

    let user = await p.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });

    if (!user) {
      const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
      const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      user = await p.user.create({
        data: {
          displayId, email: email.toLowerCase().trim(), password: 'google_oauth_' + Date.now(),
          fullName, phone: '', picture: picture || '', googleId, invitationCode,
          invitationLink: `${process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app'}/register?ref=${invitationCode}`,
          referralCount: 0, totalReferralEarnings: 0,
        },
      });
      await p.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
    }

    const accessToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jw.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

    res.json({
      user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt },
      accessToken, refreshToken, isNew: true,
    });
    console.log('=== GOOGLE: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== GOOGLE ERROR:', error?.message || error, '===');
    res.status(500).json({ error: 'Google authentication failed' });
  }
}));

// ============================================================
// FALLBACK 404 handler
// ============================================================
app.use(wrapHandler((_req, res) => {
  console.log('=== 404 HANDLER: Route not found ===');
  res.status(404).json({ error: 'Route not found' });
}));

// ============================================================
// Global error handler
// ============================================================
app.use((err, _req, res, _next) => {
  console.error('=== GLOBAL ERROR HANDLER CAUGHT:', err?.message || err, '===');
  if (res.headersSent) return;
  try {
    res.status(500).json({ error: 'Internal server error' });
  } catch (sendErr) {
    console.error('=== GLOBAL ERROR: Failed to send response:', sendErr?.message, '===');
  }
});

console.log('=== SERVER READY - awaiting requests ===');

export default app;