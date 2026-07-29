/**
 * Vercel Serverless Function - Self-contained Express app
 * ESM version - matches root package.json "type": "module"
 */
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

console.log('=== SERVER START ===');

// ============================================================
// CRITICAL: Check DATABASE_URL before creating PrismaClient
// ============================================================
if (!process.env.DATABASE_URL) {
  console.error('=== FATAL: DATABASE_URL NOT FOUND ===');
  throw new Error('DATABASE_URL environment variable is required but was not found. Set it in Vercel environment variables.');
}
console.log('=== DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 30) + '... ===');

const prisma = new PrismaClient();
console.log('=== PRISMA CLIENT CREATED ===');

const app = express();
console.log('=== EXPRESS APP CREATED ===');

app.use(cors({ origin: () => true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

console.log('=== MIDDLEWARE REGISTERED ===');

// ============================================================
// HEALTH CHECK - Must respond immediately
// ============================================================
app.get('/api/health', (_req, res) => {
  console.log('=== /api/health CALLED ===');
  try {
    res.json({
      status: 'ok',
      database: process.env.DATABASE_URL ? 'configured' : 'missing',
      server: 'running',
      timestamp: new Date().toISOString(),
    });
    console.log('=== /api/health RESPONSE SENT ===');
  } catch (err) {
    console.error('=== /api/health ERROR:', err?.message, '===');
    res.status(500).json({ error: 'Health check failed' });
  }
});

// ============================================================
// REGISTER - Every step logged
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  console.log('=== REGISTER: REQUEST START ===');
  try {
    console.log('=== REGISTER: PARSING BODY ===');
    const { fullName, email, phone, password } = req.body;
    console.log('=== REGISTER: BODY RECEIVED ===', { fullName: !!fullName, email: !!email, phone: !!phone, password: !!password });

    if (!fullName || !email || !phone || !password) {
      console.log('=== REGISTER: VALIDATION FAILED - MISSING FIELDS ===');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    console.log('=== REGISTER: VALIDATION OK ===');

    console.log('=== REGISTER: CHECKING EXISTING USER ===');
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
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
    const user = await prisma.user.create({
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
    await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
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
  } catch (error) {
    console.error('=== REGISTER: CATCH BLOCK ===');
    console.error('=== REGISTER: Error name:', error?.name || 'Unknown ===');
    console.error('=== REGISTER: Error message:', error?.message || 'Unknown ===');
    console.error('=== REGISTER: Error stack:', error?.stack || 'No stack ===');
    
    // Prisma-specific
    if (error?.code) console.error('=== REGISTER: Prisma code:', error.code, '===');
    if (error?.meta) console.error('=== REGISTER: Prisma meta:', JSON.stringify(error.meta), '===');
    
    console.error('=== REGISTER: SENDING 500 ===');
    res.status(500).json({ error: 'Registration failed' });
    console.error('=== REGISTER: 500 SENT ===');
  }
  console.log('=== REGISTER: REQUEST FINISHED ===');
});

// ============================================================
// LOGIN - Every step logged
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN: REQUEST START ===');
  try {
    console.log('=== LOGIN: PARSING BODY ===');
    const { email, password } = req.body;
    console.log('=== LOGIN: BODY RECEIVED ===', { email: !!email, password: !!password });

    console.log('=== LOGIN: FINDING USER ===');
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
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
  } catch (error) {
    console.error('=== LOGIN: CATCH BLOCK ===');
    console.error('=== LOGIN: Error name:', error?.name || 'Unknown ===');
    console.error('=== LOGIN: Error message:', error?.message || 'Unknown ===');
    console.error('=== LOGIN: Error stack:', error?.stack || 'No stack ===');
    if (error?.code) console.error('=== LOGIN: Prisma code:', error.code, '===');
    
    console.error('=== LOGIN: SENDING 500 ===');
    res.status(500).json({ error: 'Login failed' });
    console.error('=== LOGIN: 500 SENT ===');
  }
  console.log('=== LOGIN: REQUEST FINISHED ===');
});

// ============================================================
// GOOGLE AUTH
// ============================================================
app.post('/api/auth/google', async (req, res) => {
  console.log('=== GOOGLE: REQUEST START ===');
  try {
    const { googleId, email, fullName, picture } = req.body;
    console.log('=== GOOGLE: BODY RECEIVED ===', { googleId: !!googleId, email: !!email, fullName: !!fullName });
    if (!googleId || !email || !fullName) {
      console.log('=== GOOGLE: MISSING FIELDS ===');
      return res.status(400).json({ error: 'Missing required Google user data' });
    }

    console.log('=== GOOGLE: FINDING USER ===');
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });
    console.log('=== GOOGLE: USER FOUND ===', { exists: !!user });

    if (!user) {
      console.log('=== GOOGLE: CREATING NEW USER ===');
      const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
      const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      user = await prisma.user.create({
        data: {
          displayId, email: email.toLowerCase().trim(), password: 'google_oauth_' + Date.now(),
          fullName, phone: '', picture: picture || '', googleId, invitationCode,
          invitationLink: `${process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app'}/register?ref=${invitationCode}`,
          referralCount: 0, totalReferralEarnings: 0,
        },
      });
      console.log('=== GOOGLE: USER CREATED ===', { userId: user.id });

      console.log('=== GOOGLE: CREATING WALLET ===');
      await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
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
  } catch (error) {
    console.error('=== GOOGLE: CATCH BLOCK ===');
    console.error('=== GOOGLE: Error name:', error?.name || 'Unknown ===');
    console.error('=== GOOGLE: Error message:', error?.message || 'Unknown ===');
    console.error('=== GOOGLE: Error stack:', error?.stack || 'No stack ===');
    if (error?.code) console.error('=== GOOGLE: Prisma code:', error.code, '===');
    
    console.error('=== GOOGLE: SENDING 500 ===');
    res.status(500).json({ error: 'Google authentication failed' });
    console.error('=== GOOGLE: 500 SENT ===');
  }
  console.log('=== GOOGLE: REQUEST FINISHED ===');
});

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