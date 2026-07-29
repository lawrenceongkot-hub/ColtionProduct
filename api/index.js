/**
 * Vercel Serverless Function - Self-contained Express app
 * CommonJS version - avoids ESM issues with Vercel's api/ directory runtime
 * 
 * FIX: Initialize Prisma lazily to avoid cold start hangs.
 * FIX: Added response timeouts to prevent hanging requests.
 * FIX: Health check responds immediately without any async initialization.
 */
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('=== SERVER START ===');

// ============================================================
// LAZY PRISMA - Don't create at module scope to avoid cold start hangs
// ============================================================
let prisma = null;

function getPrisma() {
  if (!prisma) {
    console.log('=== CREATING PRISMA CLIENT (lazy) ===');
    if (!process.env.DATABASE_URL) {
      console.error('=== FATAL: DATABASE_URL NOT FOUND ===');
      throw new Error('DATABASE_URL environment variable is required but was not found. Set it in Vercel environment variables.');
    }
    console.log('=== DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 30) + '... ===');
    prisma = new PrismaClient();
    console.log('=== PRISMA CLIENT CREATED ===');
  }
  return prisma;
}

const app = express();
console.log('=== EXPRESS APP CREATED ===');

app.use(cors({ origin: () => true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

console.log('=== MIDDLEWARE REGISTERED ===');

// ============================================================
// IMMEDIATE RESPONSE WRAPPER
// Prevents hanging by ensuring every route sends a response
// ============================================================
function wrapHandler(fn) {
  return (req, res, next) => {
    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`=== TIMEOUT: ${req.method} ${req.path} timed out ===`);
        res.status(504).json({ error: 'Request timeout', path: req.path });
      }
    }, 25000);

    const done = () => {
      clearTimeout(timeout);
    };

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
// HEALTH CHECK - Pure sync, no Prisma, instant response
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
  const p = getPrisma();
  const { fullName, email, phone, password } = req.body;
  console.log('=== REGISTER: BODY RECEIVED ===', { fullName: !!fullName, email: !!email, phone: !!phone, password: !!password });

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existing = await p.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
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

  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

  res.status(201).json({
    user: { id: user.id, displayId, fullName, email, phone, invitationCode, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  });
  console.log('=== REGISTER: RESPONSE SENT ===');
}));

// ============================================================
// LOGIN
// ============================================================
app.post('/api/auth/login', wrapHandler(async (req, res) => {
  console.log('=== LOGIN: REQUEST START ===');
  const p = getPrisma();
  const { email, password } = req.body;

  const user = await p.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
  if (!user) {
    return res.status(400).json({ error: 'No account found with this email.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Incorrect password.' });
  }

  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

  res.json({
    user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  });
  console.log('=== LOGIN: RESPONSE SENT ===');
}));

// ============================================================
// GOOGLE AUTH
// ============================================================
app.post('/api/auth/google', wrapHandler(async (req, res) => {
  console.log('=== GOOGLE: REQUEST START ===');
  const p = getPrisma();
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

  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });

  res.json({
    user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt },
    accessToken, refreshToken, isNew: true,
  });
  console.log('=== GOOGLE: RESPONSE SENT ===');
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
  console.error('=== GLOBAL ERROR HANDLER CAUGHT ===');
  console.error('=== GLOBAL ERROR:', err?.message || err, '===');
  
  if (res.headersSent) return;
  
  try {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  } catch (sendErr) {
    console.error('=== GLOBAL ERROR: Failed to send response:', sendErr?.message, '===');
  }
});

console.log('=== SERVER READY - awaiting requests ===');

module.exports = app;