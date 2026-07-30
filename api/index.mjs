/**
 * Vercel Serverless Function - Complete Express app for ALL routes
 * ESM version - matches root package.json "type": "module"
 * 
 * This is the SINGLE entry point for ALL /api/* requests on Vercel.
 * Every route the application needs is defined here.
 */
import express from 'express';
import cors from 'cors';

console.log('=== SERVERLESS FUNCTION START ===');

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
// JWT HELPERS
// ============================================================
function generateTokens(userId, email, role) {
  const accessToken = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function generateInvitationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateDisplayId() {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += Math.floor(Math.random() * 10).toString();
  }
  return id;
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
}));

// ============================================================
// AUTH ROUTES
// ============================================================

// REGISTER
app.post('/api/auth/register', wrapHandler(async (req, res) => {
  console.log('=== REGISTER: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const jw = await ensureJwt();
    
    const { fullName, email, phone, password, referralCode } = req.body;
    console.log('=== REGISTER: BODY RECEIVED ===', { fullName: !!fullName, email: !!email, phone: !!phone, password: !!password });

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields: fullName, email, phone, password' });
    }

    const existingEmail = await p.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered.' });

    const existingPhone = await p.user.findFirst({ where: { phone } });
    if (existingPhone) return res.status(400).json({ error: 'Mobile number is already registered.' });

    const hashedPassword = await bc.hash(password, 12);
    const displayId = generateDisplayId();
    const invitationCode = generateInvitationCode();

    // Validate referral code
    let invitedBy = null;
    let referrerAgentId = null;
    if (referralCode) {
      const code = referralCode.trim().toUpperCase();
      const referrerUser = await p.user.findFirst({ where: { invitationCode: code } });
      const agent = await p.agentProfile.findUnique({ where: { agentCode: code } }).catch(() => null);
      if (referrerUser) invitedBy = code;
      if (agent) referrerAgentId = agent.id;
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app';
    const invitationLink = `${baseUrl}/register?ref=${invitationCode}`;

    const result = await p.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayId,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          fullName,
          phone,
          invitationCode,
          invitationLink,
          invitedBy,
          referrerAgentId,
          referralCount: 0,
          totalReferralEarnings: 0,
        },
      });

      await tx.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });

      if (invitedBy) {
        await tx.referral.create({
          data: { inviterCode: invitedBy, referredUserId: user.id, referredName: fullName, referredEmail: email, status: 'active' },
        });
        const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
        if (inviter) {
          await tx.user.update({ where: { id: inviter.id }, data: { referralCount: inviter.referralCount + 1 } });
        }
      }

      if (referrerAgentId) {
        await tx.agentReferral.create({
          data: { agentId: referrerAgentId, userId: user.id, fullName, email: email.toLowerCase().trim(), status: 'WAITING_DEPOSIT' },
        });
        await tx.agentProfile.update({ where: { id: referrerAgentId }, data: { totalReferrals: { increment: 1 } } });
      }

      const tokens = generateTokens(user.id, user.email);
      await tx.userSession.create({
        data: { userId: user.id, token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });

      return { user, tokens };
    });

    res.status(201).json({
      user: { id: result.user.id, displayId, fullName, email, phone, invitationCode, invitationLink, invitedBy, createdAt: result.user.createdAt },
      ...result.tokens,
    });
    console.log('=== REGISTER: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== REGISTER ERROR:', error?.message || error, '===');
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A user with this email already exists.' });
    res.status(500).json({ error: 'Registration failed' });
  }
}));

// LOGIN
app.post('/api/auth/login', wrapHandler(async (req, res) => {
  console.log('=== LOGIN: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const jw = await ensureJwt();
    
    const { email, password } = req.body;
    const user = await p.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
    if (!user) return res.status(400).json({ error: 'No account found with this email address.' });

    const valid = await bc.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password. Please try again.' });

    const tokens = generateTokens(user.id, user.email);
    await p.userSession.create({
      data: { userId: user.id, token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, invitationLink: user.invitationLink, invitedBy: user.invitedBy, referralCount: user.referralCount, totalReferralEarnings: user.totalReferralEarnings, picture: user.picture, createdAt: user.createdAt },
      ...tokens,
    });
    console.log('=== LOGIN: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== LOGIN ERROR:', error?.message || error, '===');
    res.status(500).json({ error: 'Login failed' });
  }
}));

// GOOGLE AUTH
app.post('/api/auth/google', wrapHandler(async (req, res) => {
  console.log('=== GOOGLE: REQUEST START ===');
  try {
    const p = await ensurePrisma();
    const jw = await ensureJwt();
    
    const { googleId, email, fullName, picture, referralCode } = req.body;
    if (!googleId || !email || !fullName) return res.status(400).json({ error: 'Missing required Google user data' });

    let user = await p.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });
    let isNew = false;

    if (!user) {
      const displayId = generateDisplayId();
      const invitationCode = generateInvitationCode();
      const baseUrl = process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app';
      const invitationLink = `${baseUrl}/register?ref=${invitationCode}`;

      let invitedBy = null;
      let referrerAgentId = null;
      if (referralCode) {
        const code = referralCode.trim().toUpperCase();
        const referrerUser = await p.user.findFirst({ where: { invitationCode: code } });
        const agent = await p.agentProfile.findUnique({ where: { agentCode: code } }).catch(() => null);
        if (referrerUser) invitedBy = code;
        if (agent) referrerAgentId = agent.id;
      }

      const result = await p.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { displayId, email: email.toLowerCase().trim(), password: 'google_oauth_' + Date.now(), fullName, phone: '', picture: picture || '', googleId, invitationCode, invitationLink, invitedBy, referrerAgentId, referralCount: 0, totalReferralEarnings: 0 },
        });
        await tx.wallet.create({ data: { userId: newUser.id, main: 0, semWallet: 0, ongoing: 0 } });

        if (invitedBy) {
          await tx.referral.create({ data: { inviterCode: invitedBy, referredUserId: newUser.id, referredName: fullName, referredEmail: email, status: 'active' } });
          const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
          if (inviter) await tx.user.update({ where: { id: inviter.id }, data: { referralCount: inviter.referralCount + 1 } });
        }
        if (referrerAgentId) {
          await tx.agentReferral.create({ data: { agentId: referrerAgentId, userId: newUser.id, fullName, email: email.toLowerCase().trim(), status: 'WAITING_DEPOSIT' } });
          await tx.agentProfile.update({ where: { id: referrerAgentId }, data: { totalReferrals: { increment: 1 } } });
        }
        return newUser;
      });

      user = result;
      isNew = true;
    }

    const tokens = generateTokens(user.id, user.email);
    await p.userSession.create({
      data: { userId: user.id, token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, picture: user.picture, invitationCode: user.invitationCode, invitationLink: user.invitationLink, invitedBy: user.invitedBy, referralCount: user.referralCount, totalReferralEarnings: user.totalReferralEarnings, createdAt: user.createdAt },
      ...tokens,
      isNew,
    });
    console.log('=== GOOGLE: RESPONSE SENT ===');
  } catch (error) {
    console.error('=== GOOGLE ERROR:', error?.message || error, '===');
    res.status(500).json({ error: 'Google authentication failed' });
  }
}));

// REFRESH TOKEN
app.post('/api/auth/refresh', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const jw = await ensureJwt();
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jw.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    const session = await p.userSession.findFirst({ where: { refreshToken, userId: decoded.id } });
    if (!session) return res.status(403).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(decoded.id, decoded.email);
    await p.userSession.update({ where: { id: session.id }, data: { token: tokens.accessToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.json(tokens);
  } catch {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
}));

// LOGOUT
app.post('/api/auth/logout', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      await p.userSession.deleteMany({ where: { userId: decoded.id } });
    }
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
}));

// GET CURRENT USER (ME)
app.get('/api/auth/me', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await p.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, displayId: true, fullName: true, email: true, phone: true, invitationCode: true, invitationLink: true, invitedBy: true, referralCount: true, totalReferralEarnings: true, picture: true, googleId: true, createdAt: true, wallet: { select: { main: true, semWallet: true, ongoing: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}));

// AUTH CHECK
app.get('/api/auth/check', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.json({ authenticated: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await p.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, fullName: true } });
    if (!user) return res.json({ authenticated: false });

    res.json({ authenticated: true, user });
  } catch {
    res.json({ authenticated: false });
  }
}));

// ============================================================
// WALLET ROUTES
// ============================================================
app.get('/api/wallet', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const wallet = await p.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.json(wallet);
  } catch (error) {
    console.error('=== WALLET ERROR:', error?.message, '===');
    res.status(500).json({ error: 'Failed to get wallet' });
  }
}));

// ============================================================
// DEPOSIT ROUTES
// ============================================================
app.post('/api/deposits', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { amount, method, walletNumber, proofOfPayment } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const reference = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const deposit = await p.deposit.create({
      data: { userId: req.user.id, amount: parseFloat(amount), method: method || 'bank_transfer', reference, walletNumber: walletNumber || '', proofOfPayment: proofOfPayment || '', status: 'PENDING' },
    });
    res.status(201).json(deposit);
  } catch (error) {
    console.error('=== DEPOSIT ERROR:', error?.message, '===');
    res.status(500).json({ error: 'Failed to create deposit' });
  }
}));

app.get('/api/deposits', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const deposits = await p.deposit.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(deposits);
  } catch {
    res.status(500).json({ error: 'Failed to get deposits' });
  }
}));

// ============================================================
// WITHDRAWAL ROUTES
// ============================================================
app.post('/api/withdrawals', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { amount, method, walletNumber } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const wallet = await p.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet || wallet.main < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const reference = 'WTH-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const withdrawal = await p.withdrawal.create({
      data: { userId: req.user.id, amount: parseFloat(amount), method: method || 'bank_transfer', walletNumber: walletNumber || '', reference, status: 'PENDING' },
    });
    res.status(201).json(withdrawal);
  } catch (error) {
    console.error('=== WITHDRAWAL ERROR:', error?.message, '===');
    res.status(500).json({ error: 'Failed to create withdrawal' });
  }
}));

app.get('/api/withdrawals', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const withdrawals = await p.withdrawal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(withdrawals);
  } catch {
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
}));

// ============================================================
// ORDER / VIP PURCHASE ROUTES
// ============================================================
app.post('/api/orders/purchase', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { vipLevel, vipName, vipBadge, buyAmount, dailyRate, dailyProfitPerDay, duration, totalReturn } = req.body;
    if (!vipLevel || !buyAmount || buyAmount <= 0) return res.status(400).json({ error: 'Invalid VIP level or amount' });

    const wallet = await p.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet || wallet.main < buyAmount) return res.status(400).json({ error: 'Insufficient balance' });

    const order = await p.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId: req.user.id }, data: { main: { decrement: buyAmount }, ongoing: { increment: buyAmount } } });
      return tx.investmentOrder.create({
        data: {
          userId: req.user.id,
          vipLevel,
          vipName: vipName || '',
          vipBadge: vipBadge || '',
          buyAmount: parseFloat(buyAmount),
          dailyRate: dailyRate || 0,
          dailyProfitPerDay: dailyProfitPerDay || 0,
          duration: duration || 30,
          totalReturn: totalReturn || 0,
          status: 'ACTIVE',
          purchaseDate: new Date(),
          completedDays: 0,
          currentProfit: 0,
        },
      });
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('=== ORDER ERROR:', error?.message, '===');
    res.status(500).json({ error: 'Failed to create order' });
  }
}));

app.get('/api/orders', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const orders = await p.investmentOrder.findMany({ where: { userId: req.user.id }, orderBy: { purchaseDate: 'desc' } });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to get orders' });
  }
}));

// ============================================================
// TRANSACTION ROUTES
// ============================================================
app.get('/api/transactions', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const transactions = await p.transaction.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
}));

// ============================================================
// REFERRAL ROUTES
// ============================================================
app.get('/api/referrals', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const user = await p.user.findUnique({ where: { id: req.user.id }, select: { invitationCode: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const referrals = await p.referral.findMany({ where: { inviterCode: user.invitationCode }, orderBy: { joinedDate: 'desc' } });
    res.json(referrals);
  } catch {
    res.status(500).json({ error: 'Failed to get referrals' });
  }
}));

// ============================================================
// USER PROFILE ROUTES
// ============================================================
app.put('/api/users/profile', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { fullName, phone } = req.body;
    const user = await p.user.update({ where: { id: req.user.id }, data: { ...(fullName && { fullName }), ...(phone && { phone }) } });
    res.json({ id: user.id, fullName: user.fullName, email: user.email, phone: user.phone });
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}));

app.put('/api/users/password', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

    const user = await p.user.findUnique({ where: { id: req.user.id } });
    const valid = await bc.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashedPassword = await bc.hash(newPassword, 12);
    await p.user.update({ where: { id: req.user.id }, data: { password: hashedPassword } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
}));

// ============================================================
// VERIFICATION ROUTES
// ============================================================
app.post('/api/verification', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { documentType, documentNumber, documentImage } = req.body;
    if (!documentType || !documentNumber) return res.status(400).json({ error: 'Document type and number required' });

    const verification = await p.verificationRequest.upsert({
      where: { userId: req.user.id },
      update: { email: req.user.email, mobileNumber: documentNumber, verificationCode: documentNumber, status: 'PENDING', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      create: { userId: req.user.id, email: req.user.email, mobileNumber: documentNumber, verificationCode: documentNumber, status: 'PENDING', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    res.json(verification);
  } catch {
    res.status(500).json({ error: 'Failed to submit verification' });
  }
}));

app.post('/api/verification/verify', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code required' });
    res.json({ success: true, verified: true });
  } catch {
    res.status(500).json({ error: 'Verification failed' });
  }
}));

// ============================================================
// AGENT ROUTES
// ============================================================
app.get('/api/agents/profile', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.findUnique({ where: { userId: req.user.id } });
    if (!agent) return res.status(404).json({ error: 'Agent profile not found' });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to get agent profile' });
  }
}));

app.get('/api/agents/referrals', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.findUnique({ where: { userId: req.user.id } });
    if (!agent) return res.status(404).json({ error: 'Agent profile not found' });
    const referrals = await p.agentReferral.findMany({ where: { agentId: agent.id }, orderBy: { registeredDate: 'desc' } });
    res.json(referrals);
  } catch {
    res.status(500).json({ error: 'Failed to get agent referrals' });
  }
}));

app.get('/api/agents/commissions', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.findUnique({ where: { userId: req.user.id } });
    if (!agent) return res.status(404).json({ error: 'Agent profile not found' });
    const commissions = await p.agentCommission.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: 'desc' } });
    res.json(commissions);
  } catch {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
}));

// ============================================================
// EWALLET ROUTES
// ============================================================
app.get('/api/ewallets', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const ewallets = await p.eWallet.findMany({ where: { userId: req.user.id } });
    res.json(ewallets);
  } catch {
    res.status(500).json({ error: 'Failed to get e-wallets' });
  }
}));

app.post('/api/ewallets', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { provider, walletNumber, withdrawalPassword } = req.body;
    if (!provider || !walletNumber) return res.status(400).json({ error: 'Provider and wallet number required' });
    const ewallet = await p.eWallet.create({ data: { userId: req.user.id, provider, walletNumber, withdrawalPassword: withdrawalPassword || '' } });
    res.status(201).json(ewallet);
  } catch {
    res.status(500).json({ error: 'Failed to add e-wallet' });
  }
}));

app.delete('/api/ewallets/:id', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    await p.eWallet.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete e-wallet' });
  }
}));

// ============================================================
// DASHBOARD ROUTES
// ============================================================
app.get('/api/dashboard', authenticateToken, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const wallet = await p.wallet.findUnique({ where: { userId: req.user.id } });
    const orders = await p.investmentOrder.findMany({ where: { userId: req.user.id }, orderBy: { purchaseDate: 'desc' }, take: 5 });
    const transactions = await p.transaction.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 10 });
    const user = await p.user.findUnique({ where: { id: req.user.id }, select: { referralCount: true, totalReferralEarnings: true, invitationCode: true, invitationLink: true } });
    res.json({ wallet, orders, transactions, referral: user });
  } catch {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
}));

// ============================================================
// SETTINGS ROUTES (Public)
// ============================================================
app.get('/api/settings', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const settings = await p.platformSettings.findFirst();
    res.json(settings || {});
  } catch {
    res.json({});
  }
}));

// ============================================================
// ADMIN ROUTES
// ============================================================

// Admin Login
app.post('/api/admin/login', wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const jw = await ensureJwt();
    const { email, username, password } = req.body;
    const loginId = (email || username || '').toLowerCase().trim();
    if (!loginId || !password) return res.status(400).json({ error: 'Email/username and password required' });

    // Check AdminUser model first
    let user = await p.adminUser.findUnique({ where: { username: loginId } }).catch(() => null);
    if (user) {
      const bc = await ensureBcrypt();
      const valid = await bc.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

      const tokens = generateTokens(user.id, user.username, 'admin');
      return res.json({ user: { id: user.id, fullName: user.name, email: user.username, role: user.role }, ...tokens });
    }

    // Fallback: check regular User model
    user = await p.user.findUnique({ where: { email: loginId } });
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });

    const bc = await ensureBcrypt();
    const valid = await bc.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const tokens = generateTokens(user.id, user.email, 'admin');
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }, ...tokens });
  } catch (error) {
    console.error('=== ADMIN LOGIN ERROR:', error?.message, '===');
    res.status(500).json({ error: 'Admin login failed' });
  }
}));

// Admin Dashboard
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const totalUsers = await p.user.count();
    const totalDeposits = await p.deposit.aggregate({ _sum: { amount: true } });
    const totalWithdrawals = await p.withdrawal.aggregate({ _sum: { amount: true } });
    const pendingDeposits = await p.deposit.count({ where: { status: 'PENDING' } });
    const pendingWithdrawals = await p.withdrawal.count({ where: { status: 'PENDING' } });
    const activeOrders = await p.investmentOrder.count({ where: { status: 'ACTIVE' } });
    const recentUsers = await p.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, fullName: true, email: true, createdAt: true } });
    res.json({ totalUsers, totalDeposits: totalDeposits._sum.amount || 0, totalWithdrawals: totalWithdrawals._sum.amount || 0, pendingDeposits, pendingWithdrawals, activeOrders, recentUsers });
  } catch {
    res.status(500).json({ error: 'Failed to get admin dashboard' });
  }
}));

// Admin Users
app.get('/api/admin/users', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const users = await p.user.findMany({ orderBy: { createdAt: 'desc' }, include: { wallet: true } });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to get users' });
  }
}));

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    await p.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
}));

// Admin Deposits
app.get('/api/admin/deposits', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const deposits = await p.deposit.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } });
    res.json(deposits);
  } catch {
    res.status(500).json({ error: 'Failed to get deposits' });
  }
}));

app.put('/api/admin/deposits/:id/approve', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const deposit = await p.deposit.update({ where: { id: req.params.id }, data: { status: 'SUCCESS', approvedBy: req.user.email, completedAt: new Date() } });
    // Credit user wallet
    await p.wallet.update({ where: { userId: deposit.userId }, data: { main: { increment: deposit.amount } } });
    res.json(deposit);
  } catch {
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
}));

app.put('/api/admin/deposits/:id/reject', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { reason } = req.body;
    const deposit = await p.deposit.update({ where: { id: req.params.id }, data: { status: 'FAILED', rejectionReason: reason || 'Rejected by admin', approvedBy: req.user.email } });
    res.json(deposit);
  } catch {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
}));

// Admin Withdrawals
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const withdrawals = await p.withdrawal.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } });
    res.json(withdrawals);
  } catch {
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
}));

app.put('/api/admin/withdrawals/:id/approve', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const withdrawal = await p.withdrawal.update({ where: { id: req.params.id }, data: { status: 'SUCCESS', approvedBy: req.user.email, completedAt: new Date() } });
    res.json(withdrawal);
  } catch {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
}));

app.put('/api/admin/withdrawals/:id/reject', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const { reason } = req.body;
    const withdrawal = await p.withdrawal.update({ where: { id: req.params.id }, data: { status: 'FAILED', rejectionReason: reason || 'Rejected by admin', approvedBy: req.user.email } });
    // Refund user wallet
    await p.wallet.update({ where: { userId: withdrawal.userId }, data: { main: { increment: withdrawal.amount } } });
    res.json(withdrawal);
  } catch {
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
}));

// Admin Orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const orders = await p.investmentOrder.findMany({ orderBy: { purchaseDate: 'desc' }, include: { user: { select: { fullName: true, email: true } } } });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to get orders' });
  }
}));

// Admin Transactions
app.get('/api/admin/transactions', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const transactions = await p.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { fullName: true, email: true } } } });
    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
}));

// Admin Verifications
app.get('/api/admin/verifications', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const verifications = await p.verificationRequest.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } });
    res.json(verifications);
  } catch {
    res.status(500).json({ error: 'Failed to get verifications' });
  }
}));

app.put('/api/admin/verifications/:id/approve', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const verification = await p.verificationRequest.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } });
    res.json(verification);
  } catch {
    res.status(500).json({ error: 'Failed to approve verification' });
  }
}));

app.put('/api/admin/verifications/:id/reject', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const verification = await p.verificationRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
    res.json(verification);
  } catch {
    res.status(500).json({ error: 'Failed to reject verification' });
  }
}));

// Admin Settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const settings = await p.platformSettings.findFirst();
    res.json(settings || {});
  } catch {
    res.status(500).json({ error: 'Failed to get settings' });
  }
}));

app.put('/api/admin/settings', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const settings = await p.platformSettings.upsert({ where: { id: 'default' }, update: req.body, create: { id: 'default', ...req.body } });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Failed to update settings' });
  }
}));

// Admin Agents
app.get('/api/admin/agents', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agents = await p.agentProfile.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } });
    res.json(agents);
  } catch {
    res.status(500).json({ error: 'Failed to get agents' });
  }
}));

app.put('/api/admin/agents/:id', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.update({ where: { id: req.params.id }, data: req.body });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to update agent' });
  }
}));

app.put('/api/admin/agents/:id/suspend', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to suspend agent' });
  }
}));

app.put('/api/admin/agents/:id/ban', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.update({ where: { id: req.params.id }, data: { status: 'banned' } });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to ban agent' });
  }
}));

app.put('/api/admin/agents/:id/reactivate', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.update({ where: { id: req.params.id }, data: { status: 'active' } });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to reactivate agent' });
  }
}));

app.put('/api/admin/agents/:id/force-logout', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.findUnique({ where: { id: req.params.id } });
    if (agent) {
      await p.userSession.deleteMany({ where: { userId: agent.userId } });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to force logout agent' });
  }
}));

app.put('/api/admin/agents/:id/reset-code', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const newCode = generateInvitationCode();
    const agent = await p.agentProfile.update({ where: { id: req.params.id }, data: { agentCode: newCode } });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to reset agent code' });
  }
}));

app.put('/api/admin/agents/:id/reset-password', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const bc = await ensureBcrypt();
    const agent = await p.agentProfile.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const newPassword = 'Agent@' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedPassword = await bc.hash(newPassword, 12);
    await p.user.update({ where: { id: agent.userId }, data: { password: hashedPassword } });
    res.json({ success: true, newPassword });
  } catch {
    res.status(500).json({ error: 'Failed to reset agent password' });
  }
}));

app.get('/api/admin/agents/:id', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const agent = await p.agentProfile.findUnique({ where: { id: req.params.id }, include: { user: { select: { fullName: true, email: true } } } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to get agent' });
  }
}));

app.get('/api/admin/agents/:id/referrals', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const referrals = await p.agentReferral.findMany({ where: { agentId: req.params.id }, orderBy: { registeredDate: 'desc' } });
    res.json(referrals);
  } catch {
    res.status(500).json({ error: 'Failed to get agent referrals' });
  }
}));

app.get('/api/admin/agents/:id/commissions', authenticateToken, requireAdmin, wrapHandler(async (req, res) => {
  try {
    const p = await ensurePrisma();
    const commissions = await p.agentCommission.findMany({ where: { agentId: req.params.id }, orderBy: { createdAt: 'desc' } });
    res.json(commissions);
  } catch {
    res.status(500).json({ error: 'Failed to get agent commissions' });
  }
}));

// ============================================================
// DEBUG ROUTES
// ============================================================
app.get('/api/debug/routes', wrapHandler((_req, res) => {
  res.json({ status: 'ok', message: 'All routes registered in serverless function' });
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

console.log('=== SERVERLESS FUNCTION READY - awaiting requests ===');

export default app;