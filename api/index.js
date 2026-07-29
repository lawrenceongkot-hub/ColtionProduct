/**
 * Vercel Serverless Function - Self-contained Express app
 * ESM version - matches root package.json "type": "module"
 * 
 * FIX: Initialize Prisma lazily to avoid cold start hangs.
 * FIX: Added response timeouts to prevent hanging requests.
 * FIX: Health check responds immediately without any async initialization.
 * FIX: Use dynamic import() for PrismaClient since we're in ESM mode.
 */
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

console.log('=== SERVER START ===');

// ============================================================
// LAZY PRISMA - Don't create at module scope to avoid cold start hangs
// ============================================================
let prismaPromise = null;

function getPrisma() {
  if (!prismaPromise) {
    console.log('=== CREATING PRISMA CLIENT (lazy) ===');
    if (!process.env.DATABASE_URL) {
      console.error('=== FATAL: DATABASE_URL NOT FOUND ===');
      throw new Error('DATABASE_URL environment variable is required but was not found. Set it in Vercel environment variables.');
    }
    console.log('=== DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 30) + '... ===');
    // Dynamic import for ESM compatibility
    prismaPromise = import('@prisma/client').then(({ PrismaClient }) => {
      const client = new PrismaClient();
      console.log('=== PRISMA CLIENT CREATED ===');
      return client;
    });
  }
  return prismaPromise;
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
    }, 25000); // 25 second timeout (Vercel free tier is 10s, but we use 25s as safety)

    const done = () => {
      clearTimeout(timeout);
    };

    // Ensure response is sent
    res.on('finish', done);
    res.on('close', done);
    res.on('error', done);

    try {
      const result = fn(req, res, next);
      
      // Handle async functions
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
// HEALTH CHECK - Pure sync, no Prisma, no async, instant response
// ============================================================
app.get('/api/health', wrapHandler((_req, res) => {
  console.log('=== /api/health CALLED ===');
  try {
    // Respond immediately - no database calls
    res.status(200).json({
      status: 'ok',
      database: process.env.DATABASE_URL ? 'configured' : 'missing',
      server: 'running',
      timestamp: new Date().toISOString(),
    });
    console.log('=== /api/health RESPONSE SENT ===');
  } catch (err) {
    console.error('=== /api/health ERROR:', err?.message, '===');
    // Last resort - ensure response is sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Health check failed' });
    }
  }
}));

// ============================================================
// REGISTER - Every step logged
// ============================================================
app.post('/api/auth/register', wrapHandler(async (req, res) => {
  console.log('=== REGISTER: REQUEST START ===');
  const p = await getPrisma();
  console.log('=== REGISTER: PARSING BODY ===');
  const { fullName, email, phone, password } = req.body;
  console.log('=== REGISTER: BODY RECEIVED ===', { fullName: !!fullName, email: !!email, phone: !!phone, password: !!password });

  if (!fullName || !email || !phone || !password) {
    console.log('=== REGISTER: VALIDATION FAILED - MISSING FIELDS ===');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  console.log('=== REGISTER: VALIDATION OK ===');

  console.log('=== REGISTER: CHECKING EXISTING USER ===');
  const existing = await p.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  console.log('=== REGISTER: EXISTING USER CHECK DONE ===', { exists: !!existing });
  if (existing) {
    console.log('=== REGISTER: EMAIL ALREADY REGISTERED ===');
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  console.log('=== REGISTER: HASHING PASSWORD ===');
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log('=== REGISTER: PASSWORD HASHED ===');

  console.log('=== REGISTER: GENERATING IDS ===');
  const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
  const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  console.log('=== REGISTER: IDS GENERATED ===', { displayId, invitationCode });

  console.log('=== REGISTER: CREATING USER IN DATABASE ===');
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
  console.log('=== REGISTER: USER CREATED ===', { userId: user.id });

  console.log('=== REGISTER: CREATING WALLET ===');
  await p.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
  console.log('=== REGISTER: WALLET CREATED ===');

  console.log('=== REGISTER: GENERATING TOKENS ===');
  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
  console.log('=== REGISTER: TOKENS GENERATED ===');

  console.log('=== REGISTER: SENDING RESPONSE ===');
  res.status(201).json({
    user: { id: user.id, displayId, fullName, email, phone, invitationCode, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  });
  console.log('=== REGISTER: RESPONSE SENT ===');
}));

// ============================================================
// LOGIN - Every step logged
// ============================================================
app.post('/api/auth/login', wrapHandler(async (req, res) => {
  console.log('=== LOGIN: REQUEST START ===');
  const p = await getPrisma();
  console.log('=== LOGIN: PARSING BODY ===');
  const { email, password } = req.body;
  console.log('=== LOGIN: BODY RECEIVED ===', { email: !!email, password: !!password });

  console.log('=== LOGIN: FINDING USER ===');
  const user = await p.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
  console.log('=== LOGIN: USER FOUND ===', { exists: !!user });
  if (!user) {
    console.log('=== LOGIN: USER NOT FOUND ===');
    return res.status(400).json({ error: 'No account found with this email.' });
  }

  console.log('=== LOGIN: COMPARING PASSWORD ===');
  const valid = await bcrypt.compare(password, user.password);
  console.log('=== LOGIN: PASSWORD VALID ===', { valid });
  if (!valid) {
    console.log('=== LOGIN: INVALID PASSWORD ===');
    return res.status(400).json({ error: 'Incorrect password.' });
  }

  console.log('=== LOGIN: GENERATING TOKENS ===');
  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
  console.log('=== LOGIN: TOKENS GENERATED ===');

  console.log('=== LOGIN: SENDING RESPONSE ===');
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
  const p = await getPrisma();
  const { googleId, email, fullName, picture } = req.body;
  console.log('=== GOOGLE: BODY RECEIVED ===', { googleId: !!googleId, email: !!email, fullName: !!fullName });
  if (!googleId || !email || !fullName) {
    console.log('=== GOOGLE: MISSING FIELDS ===');
    return res.status(400).json({ error: 'Missing required Google user data' });
  }

  console.log('=== GOOGLE: FINDING USER ===');
  let user = await p.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });
  console.log('=== GOOGLE: USER FOUND ===', { exists: !!user });

  if (!user) {
    console.log('=== GOOGLE: CREATING NEW USER ===');
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
    console.log('=== GOOGLE: USER CREATED ===', { userId: user.id });

    console.log('=== GOOGLE: CREATING WALLET ===');
    await p.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
    console.log('=== GOOGLE: WALLET CREATED ===');
  }

  console.log('=== GOOGLE: GENERATING TOKENS ===');
  const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
  console.log('=== GOOGLE: TOKENS GENERATED ===');

  console.log('=== GOOGLE: SENDING RESPONSE ===');
  res.json({
    user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt },
    accessToken, refreshToken, isNew: true,
  });
  console.log('=== GOOGLE: RESPONSE SENT ===');
}));

// ============================================================
// FALLBACK 404 handler - catches unmatched routes
// ============================================================
app.use(wrapHandler((_req, res) => {
  console.log('=== 404 HANDLER: Route not found ===');
  res.status(404).json({ error: 'Route not found' });
}));

// ============================================================
// Global error handler - catches anything that falls through
// ============================================================
app.use((err, _req, res, _next) => {
  console.error('=== GLOBAL ERROR HANDLER CAUGHT ===');
  console.error('=== GLOBAL ERROR:', err?.message || err, '===');
  console.error('=== GLOBAL STACK:', err?.stack || 'No stack', '===');
  
  if (res.headersSent) {
    console.error('=== GLOBAL ERROR: Headers already sent, cannot respond ===');
    return;
  }
  
  try {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
    console.error('=== GLOBAL ERROR: 500 SENT ===');
  } catch (sendErr) {
    console.error('=== GLOBAL ERROR: Failed to send response:', sendErr?.message, '===');
  }
});

console.log('=== SERVER READY - awaiting requests ===');

export default app;