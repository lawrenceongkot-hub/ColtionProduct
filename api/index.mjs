/**
 * Vercel Serverless Function - Complete API handler
 * All routes for the Coltion Product Investment platform.
 */
import express from 'express';

const app = express();

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json({ limit: '10mb' }));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', server: 'running', timestamp: new Date().toISOString() });
});

// ============================================================
// ALL OTHER ROUTES
// ============================================================
app.use('/api', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const { default: bcrypt } = await import('bcryptjs');
    const { default: jwt } = await import('jsonwebtoken');

    const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    const body = req.body || {};
    const p = '/api' + req.path;
    const m = req.method;

    // Helper: get auth token user
    function getTokenUser() {
      const h = req.headers['authorization'];
      const t = h?.split(' ')[1];
      return t ? jwt.verify(t, process.env.JWT_SECRET || 'fallback') : null;
    }

    // ============ AUTH ============

    // POST /api/auth/register
    if (m === 'POST' && p === '/api/auth/register') {
      const { fullName, email, phone, password, referralCode, deviceFingerprint, userAgent } = body;
      if (!fullName || !email || !phone || !password) return res.status(400).json({ error: 'Missing required fields' });
      const e = email.toLowerCase().trim();
      if (await prisma.user.findUnique({ where: { email: e } })) return res.status(400).json({ error: 'Email is already registered.' });
      if (await prisma.user.findFirst({ where: { phone } })) return res.status(400).json({ error: 'Mobile number is already registered.' });

      const hashed = await bcrypt.hash(password, 12);
      const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
      const invCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const baseUrl = process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app';
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
      const fp = deviceFingerprint || '';
      const ua = userAgent || req.headers['user-agent'] || '';

      let invitedBy = null;
      let referrerAgentId = null;
      let referrerDisplayId = null;
      if (referralCode) {
        const code = referralCode.trim().toUpperCase();
        const ru = await prisma.user.findFirst({ where: { invitationCode: code } });
        const ag = await prisma.agentProfile.findUnique({ where: { agentCode: code } }).catch(() => null);
        if (ru) { invitedBy = code; referrerDisplayId = ru.displayId; }
        if (ag) referrerAgentId = ag.id;
      }

      // Welcome Bonus Anti-Abuse: Block only if SAME device AND SAME IP
      let bonusBlocked = false;
      let bonusBlockReason = '';
      if (fp && ip) {
        const existing = await prisma.registrationFingerprint.findFirst({ where: { deviceFingerprint: fp, ipAddress: ip } });
        if (existing) {
          bonusBlocked = true;
          bonusBlockReason = 'Duplicate Device + IP';
        }
      }

      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { displayId, email: e, password: hashed, fullName, phone, invitationCode: invCode, invitationLink: `${baseUrl}/register?ref=${invCode}`, invitedBy, referrerAgentId, referrerDisplayId, registrationIp: ip, deviceFingerprint: fp, userAgent: ua, referralSource: referralCode ? 'invitation' : 'direct', invitationCodeUsed: referralCode || '', bonusGranted: !bonusBlocked, bonusBlocked, bonusBlockReason, referralCount: 0, totalReferralEarnings: 0 },
        });
        await tx.wallet.create({ data: { userId: u.id, main: 0, semWallet: 0, ongoing: 0 } });
        await tx.registrationFingerprint.create({ data: { userId: u.id, fullName, ipAddress: ip, deviceFingerprint: fp } });
        if (invitedBy) {
          await tx.referral.create({ data: { inviterCode: invitedBy, referredUserId: u.id, referredName: fullName, referredEmail: email, status: 'active' } });
          const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
          if (inviter) await tx.user.update({ where: { id: inviter.id }, data: { referralCount: inviter.referralCount + 1 } });
        }
        if (referrerAgentId) {
          await tx.agentReferral.create({ data: { agentId: referrerAgentId, userId: u.id, fullName, email: e, status: 'WAITING_DEPOSIT', referrerDisplayId: referrerDisplayId || '', registrationIp: ip, deviceFingerprint: fp, userAgent: ua, bonusGranted: !bonusBlocked, bonusBlocked, bonusBlockReason } });
          await tx.agentProfile.update({ where: { id: referrerAgentId }, data: { totalReferrals: { increment: 1 } } });
        }
        if (!bonusBlocked) {
          await tx.welcomeBonusClaim.create({ data: { userId: u.id, amount: 100, ipAddress: ip, deviceFingerprint: fp, status: 'CLAIMED' } });
          await tx.wallet.update({ where: { userId: u.id }, data: { main: { increment: 100 } } });
          await tx.transaction.create({ data: { userId: u.id, type: 'WELCOME_BONUS', amount: 100, method: 'system', reference: 'BONUS-' + Date.now(), status: 'SUCCESS', bonusApplied: 100, bonusType: 'WELCOME_BONUS' } });
        }
        const at = jwt.sign({ id: u.id, email: u.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
        const rt = jwt.sign({ id: u.id, email: u.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });
        await tx.userSession.create({ data: { userId: u.id, token: at, refreshToken: rt, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        return { user: u, accessToken: at, refreshToken: rt };
      });

      return res.status(201).json({ user: { id: user.user.id, displayId, fullName, email, phone, invitationCode: invCode, invitedBy, referrerDisplayId, bonusGranted: !bonusBlocked, bonusBlocked, bonusBlockReason, createdAt: user.user.createdAt }, accessToken: user.accessToken, refreshToken: user.refreshToken });
    }

    // POST /api/auth/login
    if (m === 'POST' && p === '/api/auth/login') {
      const user = await prisma.user.findUnique({ where: { email: body.email?.toLowerCase()?.trim() } });
      if (!user) return res.status(400).json({ error: 'No account found' });
      if (!await bcrypt.compare(body.password, user.password)) return res.status(400).json({ error: 'Incorrect password' });
      const at = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
      const rt = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });
      await prisma.userSession.create({ data: { userId: user.id, token: at, refreshToken: rt, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      return res.json({ user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, referralCount: user.referralCount, totalReferralEarnings: user.totalReferralEarnings, picture: user.picture, createdAt: user.createdAt }, accessToken: at, refreshToken: rt });
    }

    // POST /api/auth/google
    if (m === 'POST' && p === '/api/auth/google') {
      const { googleId, fullName, picture } = body;
      if (!googleId || !body.email || !fullName) return res.status(400).json({ error: 'Missing Google data' });
      let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email: body.email.toLowerCase().trim() }] } });
      let isNew = false;
      if (!user) {
        const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
        const invCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        user = await prisma.user.create({ data: { displayId, email: body.email.toLowerCase().trim(), password: 'google_' + Date.now(), fullName, phone: '', picture: picture || '', googleId, invitationCode: invCode, invitationLink: `${process.env.FRONTEND_URL || 'https://coltionproduct.vercel.app'}/register?ref=${invCode}`, referralCount: 0, totalReferralEarnings: 0 } });
        await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
        isNew = true;
      }
      const at = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
      const rt = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' });
      return res.json({ user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt }, accessToken: at, refreshToken: rt, isNew });
    }

    // POST /api/auth/logout
    if (m === 'POST' && p === '/api/auth/logout') {
      try { const u = getTokenUser(); if (u) await prisma.userSession.deleteMany({ where: { userId: u.id } }); } catch {}
      return res.json({ success: true });
    }

    // POST /api/auth/refresh
    if (m === 'POST' && p === '/api/auth/refresh') {
      const { refreshToken: rt } = body;
      if (!rt) return res.status(400).json({ error: 'Refresh token required' });
      try {
        const decoded = jwt.verify(rt, process.env.JWT_REFRESH_SECRET || 'fallback-r');
        const session = await prisma.userSession.findFirst({ where: { refreshToken: rt, userId: decoded.id } });
        if (!session) return res.status(403).json({ error: 'Invalid refresh token' });
        const tokens = { accessToken: jwt.sign({ id: decoded.id, email: decoded.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' }), refreshToken: jwt.sign({ id: decoded.id, email: decoded.email }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' }) };
        await prisma.userSession.update({ where: { id: session.id }, data: { token: tokens.accessToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
        return res.json(tokens);
      } catch { return res.status(403).json({ error: 'Invalid refresh token' }); }
    }

    // GET /api/auth/me
    if (m === 'GET' && p === '/api/auth/me') {
      try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        // Verify session exists in database
        const session = await prisma.userSession.findFirst({ where: { token, userId: decoded.id } });
        if (!session) return res.status(401).json({ error: 'Session expired' });
        const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, displayId: true, fullName: true, email: true, phone: true, invitationCode: true, invitationLink: true, invitedBy: true, referralCount: true, totalReferralEarnings: true, picture: true, googleId: true, createdAt: true, wallet: { select: { main: true, semWallet: true, ongoing: true } } } });
        if (!user) return res.status(401).json({ error: 'User not found' });
        return res.json(user);
      } catch (e) {
        // Token expired or invalid - return 401 so frontend clears it
        return res.status(401).json({ error: 'Token expired or invalid' });
      }
    }

    // GET /api/auth/check
    if (m === 'GET' && p === '/api/auth/check') {
      try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) return res.json({ authenticated: false });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        const session = await prisma.userSession.findFirst({ where: { token, userId: decoded.id } });
        if (!session) return res.json({ authenticated: false });
        const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, fullName: true } });
        return res.json({ authenticated: !!user, user });
      } catch {
        return res.json({ authenticated: false });
      }
    }

    // ============ WALLET ============
    if (m === 'GET' && p === '/api/wallet') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const w = await prisma.wallet.findUnique({ where: { userId: u.id } }); return res.json(w || { error: 'Wallet not found' }); }
      catch { return res.status(403).json({ error: 'Invalid token' }); }
    }

    // ============ DEPOSITS ============
    if (m === 'POST' && p === '/api/deposits') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { amount, method, walletNumber, proofOfPayment } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const ref = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(); const d = await prisma.deposit.create({ data: { userId: u.id, amount: parseFloat(amount), method: method || 'bank_transfer', reference: ref, walletNumber: walletNumber || '', proofOfPayment: proofOfPayment || '', status: 'PENDING' } }); return res.status(201).json(d); }
      catch (e) { return res.status(500).json({ error: e.message }); }
    }
    if (m === 'GET' && p === '/api/deposits') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const d = await prisma.deposit.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } }); return res.json(d); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ WITHDRAWALS ============
    if (m === 'POST' && p === '/api/withdrawals') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { amount, method, walletNumber } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const w = await prisma.wallet.findUnique({ where: { userId: u.id } }); if (!w || w.main < amount) return res.status(400).json({ error: 'Insufficient balance' }); const ref = 'WTH-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(); const wd = await prisma.withdrawal.create({ data: { userId: u.id, amount: parseFloat(amount), method: method || 'bank_transfer', walletNumber: walletNumber || '', reference: ref, status: 'PENDING' } }); return res.status(201).json(wd); }
      catch (e) { return res.status(500).json({ error: e.message }); }
    }
    if (m === 'GET' && p === '/api/withdrawals') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const w = await prisma.withdrawal.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ ORDERS / VIP ============
    if (m === 'POST' && p === '/api/orders/purchase') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { vipLevel, buyAmount, vipName, vipBadge, dailyRate, dailyProfitPerDay, duration, totalReturn } = body; if (vipLevel === undefined || vipLevel === null || !buyAmount || buyAmount <= 0) { return res.status(400).json({ error: 'Invalid VIP data', received: { vipLevel, buyAmount, vipName, vipBadge } }); } const w = await prisma.wallet.findUnique({ where: { userId: u.id } }); if (!w || w.main < buyAmount) return res.status(400).json({ error: 'Insufficient balance' }); const o = await prisma.$transaction(async (tx) => { await tx.wallet.update({ where: { userId: u.id }, data: { main: { decrement: buyAmount }, ongoing: { increment: buyAmount } } }); return tx.investmentOrder.create({ data: { userId: u.id, vipLevel: parseInt(vipLevel), vipName: vipName || '', vipBadge: vipBadge || '', buyAmount: parseFloat(buyAmount), dailyRate: dailyRate || 0, dailyProfitPerDay: dailyProfitPerDay || 0, duration: duration || 30, totalReturn: totalReturn || 0, status: 'ACTIVE', purchaseDate: new Date(), completedDays: 0, currentProfit: 0 } }); }); return res.status(201).json(o); }
      catch (e) { return res.status(500).json({ error: e.message }); }
    }
    if (m === 'GET' && p === '/api/orders') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const o = await prisma.investmentOrder.findMany({ where: { userId: u.id }, orderBy: { purchaseDate: 'desc' } }); return res.json(o); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ TRANSACTIONS ============
    if (m === 'GET' && p === '/api/transactions') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const t = await prisma.transaction.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 50 }); return res.json(t); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ REFERRALS ============
    if (m === 'GET' && p === '/api/referrals') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const user = await prisma.user.findUnique({ where: { id: u.id }, select: { invitationCode: true, referralCount: true, totalReferralEarnings: true } }); if (!user) return res.status(404).json({ error: 'User not found' }); const r = await prisma.referral.findMany({ where: { inviterCode: user.invitationCode }, orderBy: { joinedDate: 'desc' } }); return res.json({ referralCount: user.referralCount, totalEarnings: user.totalReferralEarnings, recentReferrals: r.map(x => ({ id: x.id, fullName: x.referredName, email: x.referredEmail, joinedDate: x.joinedDate, status: x.status })) }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ USER PROFILE ============
    if (m === 'PUT' && p === '/api/users/profile') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { fullName, phone } = body; const user = await prisma.user.update({ where: { id: u.id }, data: { ...(fullName && { fullName }), ...(phone && { phone }) } }); return res.json({ id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p === '/api/users/password') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { currentPassword, newPassword } = body; if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Required' }); const user = await prisma.user.findUnique({ where: { id: u.id } }); if (!await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ error: 'Current password is incorrect' }); await prisma.user.update({ where: { id: u.id }, data: { password: await bcrypt.hash(newPassword, 12) } }); return res.json({ success: true }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ VERIFICATION ============
    // Generate a unique 8-12 char uppercase alphanumeric verification code server-side
    function genVerificationCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const len = 8 + Math.floor(Math.random() * 5);
      let c = '';
      for (let i = 0; i < len; i++) c += chars[Math.floor(Math.random() * chars.length)];
      return c;
    }

    if (m === 'GET' && p === '/api/verification') {
      try {
        const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' });
        const user = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, email: true, phone: true, verificationCode: true, verificationStatus: true, verifiedAt: true, verificationRequestedAt: true } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json({ userId: user.id, email: user.email, mobileNumber: user.phone, verificationCode: user.verificationCode, status: user.verificationStatus, verifiedAt: user.verifiedAt, requestedAt: user.verificationRequestedAt });
      } catch { return res.status(500).json({ error: 'Failed to get verification status' }); }
    }

    if (m === 'POST' && p === '/api/verification') {
      try {
        const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' });
        const { mobileNumber } = body;
        const user = await prisma.user.findUnique({ where: { id: u.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.email) return res.status(400).json({ error: 'Email is required for verification.' });
        let finalMobile = mobileNumber || user.phone || '';
        if (!finalMobile) return res.status(400).json({ error: 'Mobile number is required for verification.' });
        if (!/^09\d{9}$/.test(finalMobile)) return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g., 09171234567).' });
        if (finalMobile !== user.phone) {
          const duplicate = await prisma.user.findFirst({ where: { phone: finalMobile, id: { not: user.id } } });
          if (duplicate) return res.status(400).json({ error: 'This mobile number is already registered to another account.' });
        }
        // If code already exists, return it — never regenerate
        if (user.verificationCode) {
          if (finalMobile !== user.phone) await prisma.user.update({ where: { id: user.id }, data: { phone: finalMobile } });
          return res.json({ userId: user.id, email: user.email, mobileNumber: finalMobile, verificationCode: user.verificationCode, status: user.verificationStatus, verifiedAt: user.verifiedAt, requestedAt: user.verificationRequestedAt, message: 'Existing verification code returned.' });
        }
        let code = genVerificationCode();
        let existing = await prisma.user.findFirst({ where: { verificationCode: code } });
        while (existing) { code = genVerificationCode(); existing = await prisma.user.findFirst({ where: { verificationCode: code } }); }
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { phone: finalMobile, verificationCode: code, verificationStatus: 'PENDING', verificationRequestedAt: new Date() },
          select: { id: true, email: true, phone: true, verificationCode: true, verificationStatus: true, verifiedAt: true, verificationRequestedAt: true },
        });
        return res.json({ userId: updated.id, email: updated.email, mobileNumber: updated.phone, verificationCode: updated.verificationCode, status: updated.verificationStatus, verifiedAt: updated.verifiedAt, requestedAt: updated.verificationRequestedAt, message: 'Verification code generated.' });
      } catch (e) { console.error('Verification code generation error:', e?.message || e); return res.status(500).json({ error: 'Failed to generate verification code' }); }
    }

    if (m === 'POST' && p === '/api/verification/verify') {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const { userId: targetUserId, action } = body;
        if (!targetUserId || !action) return res.status(400).json({ error: 'userId and action are required' });
        const target = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (action === 'APPROVE') {
          await prisma.user.update({ where: { id: targetUserId }, data: { verificationStatus: 'APPROVED', verifiedAt: new Date() } });
          return res.json({ success: true, status: 'APPROVED' });
        }
        if (action === 'REJECT') {
          await prisma.user.update({ where: { id: targetUserId }, data: { verificationStatus: 'REJECTED' } });
          return res.json({ success: true, status: 'REJECTED' });
        }
        return res.status(400).json({ error: 'Invalid action. Use APPROVE or REJECT.' });
      } catch { return res.status(500).json({ error: 'Verification update failed' }); }
    }

    // ============ EWALLETS ============
    if (m === 'GET' && p === '/api/ewallets') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const e = await prisma.eWallet.findMany({ where: { userId: u.id } }); return res.json(e); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'POST' && p === '/api/ewallets') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const { provider, walletNumber, withdrawalPassword } = body; if (!provider || !walletNumber) return res.status(400).json({ error: 'Required' }); const e = await prisma.eWallet.create({ data: { userId: u.id, provider, walletNumber, withdrawalPassword: withdrawalPassword || '' } }); return res.status(201).json(e); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'DELETE' && p.startsWith('/api/ewallets/')) {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const id = p.replace('/api/ewallets/', ''); await prisma.eWallet.deleteMany({ where: { id, userId: u.id } }); return res.json({ success: true }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ AGENTS ============
    if (m === 'GET' && p === '/api/agents/profile') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const a = await prisma.agentProfile.findUnique({ where: { userId: u.id } }); return res.json(a || { error: 'Agent profile not found' }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'GET' && p === '/api/agents/referrals') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const a = await prisma.agentProfile.findUnique({ where: { userId: u.id } }); if (!a) return res.status(404).json({ error: 'Agent not found' }); const r = await prisma.agentReferral.findMany({ where: { agentId: a.id }, orderBy: { registeredDate: 'desc' } }); return res.json(r); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'GET' && p === '/api/agents/commissions') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const a = await prisma.agentProfile.findUnique({ where: { userId: u.id } }); if (!a) return res.status(404).json({ error: 'Agent not found' }); const c = await prisma.agentCommission.findMany({ where: { agentId: a.id }, orderBy: { createdAt: 'desc' } }); return res.json(c); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ DASHBOARD ============
    if (m === 'GET' && p === '/api/dashboard') {
      try { const u = getTokenUser(); if (!u) return res.status(401).json({ error: 'Token required' }); const w = await prisma.wallet.findUnique({ where: { userId: u.id } }); const o = await prisma.investmentOrder.findMany({ where: { userId: u.id }, orderBy: { purchaseDate: 'desc' }, take: 5 }); const t = await prisma.transaction.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 10 }); const us = await prisma.user.findUnique({ where: { id: u.id }, select: { referralCount: true, totalReferralEarnings: true, invitationCode: true, invitationLink: true } }); return res.json({ wallet: w, orders: o, transactions: t, referral: us }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ SETTINGS (PUBLIC) ============
    if (m === 'GET' && p === '/api/settings') {
      try { const s = await prisma.platformSettings.findFirst(); return res.json(s || {}); }
      catch { return res.json({}); }
    }

    // ============ ADMIN ============
    if (m === 'POST' && p === '/api/admin/login') {
      try { const { email, username, password } = body; const loginId = (email || username || '').toLowerCase().trim(); if (!loginId || !password) return res.status(400).json({ error: 'Required' });
        let user = await prisma.adminUser.findUnique({ where: { username: loginId } }).catch(() => null);
        if (user) { if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalid' }); const at = jwt.sign({ id: user.id, email: user.username, role: 'admin' }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' }); const rt = jwt.sign({ id: user.id, email: user.username, role: 'admin' }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' }); return res.json({ user: { id: user.id, fullName: user.name, email: user.username, role: user.role }, accessToken: at, refreshToken: rt }); }
        user = await prisma.user.findUnique({ where: { email: loginId } }); if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' }); if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalid' }); const at = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' }); const rt = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, process.env.JWT_REFRESH_SECRET || 'fallback-r', { expiresIn: '7d' }); return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }, accessToken: at, refreshToken: rt }); }
      catch (e) { return res.status(500).json({ error: 'Admin login failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/dashboard') {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [tu, td, tw, ao, tx, as, nut, vu, pv, sb, wb, rc, wb2, av, ia, dp, ct, rp, pd, pw, pk, ft, st] = await Promise.all([
          prisma.user.count(),
          prisma.deposit.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
          prisma.withdrawal.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
          prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
          prisma.transaction.count(),
          prisma.userSession.findMany({ where: { expiresAt: { gte: new Date() } }, select: { userId: true }, distinct: ['userId'] }).then(s => s.length),
          prisma.user.count({ where: { createdAt: { gte: today } } }),
          prisma.user.count({ where: { verificationStatus: 'APPROVED' } }),
          prisma.user.count({ where: { verificationStatus: 'PENDING' } }),
          prisma.user.count({ where: { verificationStatus: { in: ['SUSPENDED', 'BANNED'] } } }),
          prisma.welcomeBonusClaim.aggregate({ _sum: { amount: true } }),
          prisma.agentCommission.aggregate({ _sum: { commissionAmount: true } }),
          prisma.wallet.aggregate({ _sum: { main: true } }),
          prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
          prisma.investmentOrder.aggregate({ _sum: { buyAmount: true }, where: { status: 'ACTIVE' } }),
          prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'DAILY_PROFIT', createdAt: { gte: today } } }),
          prisma.investmentOrder.count({ where: { status: 'ACTIVE', completedDays: { gte: 29 } } }),
          prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
          prisma.deposit.count({ where: { status: 'PENDING' } }),
          prisma.withdrawal.count({ where: { status: 'PENDING' } }),
          prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
          prisma.transaction.count({ where: { status: 'FAILED' } }),
          prisma.notification.count({ where: { read: false } }),
        ]);
        return res.json({ totalUsers: tu, onlineUsers: as, newUsersToday: nut, verifiedUsers: vu, pendingVerification: pv, suspendedBanned: sb, totalDeposits: td._sum.amount || 0, totalWithdrawals: tw._sum.amount || 0, netRevenue: (td._sum.amount || 0) - (tw._sum.amount || 0), totalWelcomeBonuses: wb._sum.amount || 0, totalReferralCommissions: rc._sum.commissionAmount || 0, totalWalletBalance: wb2._sum.main || 0, activeVIPMembers: av, activeInvestmentOrders: ao, totalInvestedAmount: ia._sum.buyAmount || 0, dailyProfitDistributedToday: dp._sum.amount || 0, investmentsCompletingToday: ct, runningInvestmentPlans: rp, pendingDeposits: pd, pendingWithdrawals: pw, pendingKYC: pk, failedTransactions: ft, pendingSupportRequests: st, lastUpdated: new Date().toISOString() });
      } catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/users') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, include: { wallet: true } }); return res.json(users); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'DELETE' && p === '/api/admin/users/wipe-all') {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const before = { users: await prisma.user.count(), transactions: await prisma.transaction.count(), deposits: await prisma.deposit.count(), withdrawals: await prisma.withdrawal.count(), wallets: await prisma.wallet.count() };
        // Delete ALL user-related data in correct FK order. Admin users are in a separate AdminUser table and are NOT touched.
        await prisma.$transaction(async (tx) => {
          await tx.changePasswordToken.deleteMany({});
          await tx.notification.deleteMany({});
          await tx.walletLedger.deleteMany({});
          await tx.auditLog.deleteMany({});
          await tx.welcomeBonusClaim.deleteMany({});
          await tx.registrationFingerprint.deleteMany({});
          await tx.verificationRequest.deleteMany({});
          await tx.agentCommission.deleteMany({});
          await tx.agentReferral.deleteMany({});
          await tx.agentProfile.deleteMany({});
          await tx.referral.deleteMany({});
          await tx.eWallet.deleteMany({});
          await tx.investmentOrder.deleteMany({});
          await tx.transaction.deleteMany({});
          await tx.withdrawal.deleteMany({});
          await tx.deposit.deleteMany({});
          await tx.userSession.deleteMany({});
          await tx.wallet.deleteMany({});
          await tx.user.deleteMany({});
        });
        const after = { users: await prisma.user.count(), transactions: await prisma.transaction.count(), deposits: await prisma.deposit.count(), withdrawals: await prisma.withdrawal.count(), wallets: await prisma.wallet.count() };
        return res.json({ success: true, message: 'All registered accounts and data wiped. Statistics reset.', before, after });
      } catch (e) { console.error('Wipe all users error:', e?.message || e); return res.status(500).json({ error: e?.message || 'Failed to wipe users' }); }
    }
    if (m === 'DELETE' && p.startsWith('/api/admin/users/')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.replace('/api/admin/users/', ''); if (id === 'wipe-all') return res.status(400).json({ error: 'Use the dedicated wipe-all endpoint' }); await prisma.user.delete({ where: { id } }); return res.json({ success: true }); }
      catch (e) { return res.status(500).json({ error: e?.message || 'Failed' }); }
    }
    if (m === 'GET' && p.startsWith('/api/admin/users/') && p.endsWith('/wallet')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const w = await prisma.wallet.findUnique({ where: { userId: id } }); return res.json(w || { main: 0, semWallet: 0, ongoing: 0 }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'GET' && p.startsWith('/api/admin/users/') && p.endsWith('/audit')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const logs = await prisma.auditLog.findMany({ where: { userId: id }, orderBy: { timestamp: 'desc' }, take: 50 }); return res.json(logs); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/wallet/main/add')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { amount } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const w = await prisma.wallet.update({ where: { userId: id }, data: { main: { increment: parseFloat(amount) } } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Add Main Wallet', amount: parseFloat(amount), timestamp: new Date() } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/wallet/main/deduct')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { amount } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const w = await prisma.wallet.update({ where: { userId: id }, data: { main: { decrement: parseFloat(amount) } } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Deduct Main Wallet', amount: parseFloat(amount), timestamp: new Date() } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/wallet/sem/add')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { amount } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const w = await prisma.wallet.update({ where: { userId: id }, data: { semWallet: { increment: parseFloat(amount) } } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Add SemWallet', amount: parseFloat(amount), timestamp: new Date() } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/wallet/sem/deduct')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { amount } = body; if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' }); const w = await prisma.wallet.update({ where: { userId: id }, data: { semWallet: { decrement: parseFloat(amount) } } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Deduct SemWallet', amount: parseFloat(amount), timestamp: new Date() } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/ban')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const user = await prisma.user.update({ where: { id }, data: { status: 'banned' } }); await prisma.userSession.deleteMany({ where: { userId: id } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Account Banned', timestamp: new Date() } }); return res.json(user); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/unban')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const user = await prisma.user.update({ where: { id }, data: { status: 'active' } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Account Unbanned', timestamp: new Date() } }); return res.json(user); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/suspend')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const user = await prisma.user.update({ where: { id }, data: { status: 'suspended' } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Account Suspended', timestamp: new Date() } }); return res.json(user); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/activate')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const user = await prisma.user.update({ where: { id }, data: { status: 'active' } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Account Activated', timestamp: new Date() } }); return res.json(user); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/force-logout')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; await prisma.userSession.deleteMany({ where: { userId: id } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Force Logout', timestamp: new Date() } }); return res.json({ success: true }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/users/') && p.endsWith('/password')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { newPassword } = body; if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' }); const user = await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(newPassword, 12) } }); await prisma.userSession.deleteMany({ where: { userId: id } }); await prisma.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: 'Password Changed', timestamp: new Date() } }); return res.json(user); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/deposits') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const d = await prisma.deposit.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } }); return res.json(d); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.includes('/api/admin/deposits/') && p.endsWith('/approve')) {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const id = p.split('/')[4];
        const d = await prisma.deposit.findUnique({ where: { id } });
        if (!d) return res.status(404).json({ error: 'Deposit not found' });
        await prisma.$transaction(async (tx) => {
          await tx.deposit.update({ where: { id }, data: { status: 'SUCCESS', approvedBy: u.email, completedAt: new Date() } });
          await tx.wallet.update({ where: { userId: d.userId }, data: { main: { increment: d.amount } } });
          await tx.transaction.create({ data: { userId: d.userId, type: 'DEPOSIT', amount: d.amount, method: d.method, reference: d.reference, status: 'SUCCESS', approvedBy: u.email, completedAt: new Date() } });
          // Referral commission: check if depositing user has a referrer
          const depositor = await tx.user.findUnique({ where: { id: d.userId }, select: { referrerAgentId: true, invitedBy: true } });
          if (depositor?.referrerAgentId) {
            const settings = await tx.platformSettings.findFirst();
            const rate = (settings?.referralCommissionPercent || 30) / 100;
            const commission = d.amount * rate;
            const agent = await tx.agentProfile.findUnique({ where: { id: depositor.referrerAgentId } });
            if (agent) {
              await tx.agentCommission.create({ data: { agentId: agent.id, referredUserId: d.userId, referredName: d.user?.fullName || 'User', depositAmount: d.amount, commissionRate: rate, commissionAmount: commission } });
              await tx.agentProfile.update({ where: { id: agent.id }, data: { totalCommission: { increment: commission }, qualifiedDeposits: { increment: 1 }, availableBalance: { increment: commission } } });
              await tx.agentReferral.updateMany({ where: { agentId: agent.id, userId: d.userId }, data: { status: 'COMMISSION_PAID', firstDeposit: d.amount, commission } });
              await tx.wallet.update({ where: { userId: agent.userId }, data: { main: { increment: commission } } });
              await tx.transaction.create({ data: { userId: agent.userId, type: 'REFERRAL_COMMISSION', amount: commission, method: 'system', reference: 'COMM-' + Date.now(), status: 'SUCCESS' } });
            }
          }
        });
        return res.json({ success: true });
      } catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.includes('/api/admin/deposits/') && p.endsWith('/reject')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { reason } = body; const d = await prisma.deposit.update({ where: { id }, data: { status: 'FAILED', rejectionReason: reason || 'Rejected', approvedBy: u.email } }); return res.json(d); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/withdrawals') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const w = await prisma.withdrawal.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { fullName: true, email: true } } } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.includes('/api/admin/withdrawals/') && p.endsWith('/approve')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const w = await prisma.withdrawal.update({ where: { id }, data: { status: 'SUCCESS', approvedBy: u.email, completedAt: new Date() } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.includes('/api/admin/withdrawals/') && p.endsWith('/reject')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const { reason } = body; const w = await prisma.withdrawal.update({ where: { id }, data: { status: 'FAILED', rejectionReason: reason || 'Rejected', approvedBy: u.email } }); await prisma.wallet.update({ where: { userId: w.userId }, data: { main: { increment: w.amount } } }); return res.json(w); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/orders') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const o = await prisma.investmentOrder.findMany({ orderBy: { purchaseDate: 'desc' }, include: { user: { select: { fullName: true, email: true } } } }); return res.json(o); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/transactions') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const t = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { fullName: true, email: true } } } }); return res.json(t); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/verifications') {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const users = await prisma.user.findMany({
          orderBy: { verificationRequestedAt: 'desc' },
          where: { OR: [{ verificationCode: { not: null } }, { verificationStatus: { not: 'NONE' } }] },
          select: { id: true, fullName: true, email: true, phone: true, verificationCode: true, verificationStatus: true, verifiedAt: true, verificationRequestedAt: true },
        });
        return res.json(users.map(x => ({ id: x.id, userId: x.id, user: { fullName: x.fullName, email: x.email }, fullName: x.fullName, email: x.email, mobileNumber: x.phone, verificationCode: x.verificationCode, status: x.verificationStatus || 'NONE', createdAt: x.verificationRequestedAt, verifiedAt: x.verifiedAt })));
      } catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/verifications/') && (p.endsWith('/approve') || p.endsWith('/reject'))) {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const id = p.split('/')[4];
        const action = p.endsWith('/approve') ? 'APPROVED' : 'REJECTED';
        const target = await prisma.user.findUnique({ where: { id } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id }, data: action === 'APPROVED' ? { verificationStatus: 'APPROVED', verifiedAt: new Date() } : { verificationStatus: 'REJECTED' } });
          await tx.auditLog.create({ data: { adminId: u.id, adminName: u.email, adminRole: 'admin', userId: id, action: action === 'APPROVED' ? 'KYC Approved' : 'KYC Rejected', timestamp: new Date() } });
        });
        return res.json({ success: true });
      } catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/settings') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const s = await prisma.platformSettings.findFirst(); return res.json(s || {}); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p === '/api/admin/settings') {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const s = await prisma.platformSettings.upsert({ where: { id: 'default' }, update: body, create: { id: 'default', ...body } }); return res.json(s); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    if (m === 'GET' && p === '/api/admin/agents') {
      try {
        const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
        const agents = await prisma.agentProfile.findMany({ orderBy: { id: 'desc' }, include: { user: { select: { fullName: true, email: true, displayId: true } }, referrals: true, commissions: true } });
        const enriched = await Promise.all(agents.map(async (a) => {
          const referredUserIds = a.referrals.map(r => r.userId);
          const users = referredUserIds.length ? await prisma.user.findMany({ where: { id: { in: referredUserIds } }, select: { id: true, verificationStatus: true, status: true, deposits: { where: { status: 'SUCCESS' }, select: { amount: true } }, withdrawals: { where: { status: 'SUCCESS' }, select: { amount: true } } } }) : [];
          const totalDeposits = users.reduce((sum, usr) => sum + usr.deposits.reduce((s, d) => s + d.amount, 0), 0);
          const totalWithdrawals = users.reduce((sum, usr) => sum + usr.withdrawals.reduce((s, w) => s + w.amount, 0), 0);
          const verifiedUsers = users.filter(usr => usr.verificationStatus === 'APPROVED').length;
          const activeUsers = users.filter(usr => usr.status === 'active').length;
          const inactiveUsers = users.filter(usr => usr.status !== 'active').length;
          const usersWithDeposit = users.filter(usr => usr.deposits.length > 0).length;
          const usersWithoutDeposit = users.length - usersWithDeposit;
          const totalCommission = a.commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
          const pendingCommission = a.referrals.filter(r => r.status === 'WAITING_DEPOSIT' && r.firstDeposit).reduce((sum, r) => sum + (r.commission || 0), 0);
          const paidCommission = a.commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
          const conversionRate = a.totalReferrals > 0 ? Math.round((usersWithDeposit / a.totalReferrals) * 100) : 0;
          return { ...a, displayId: a.user?.displayId || '', totalDeposits, totalWithdrawals, verifiedUsers, activeUsers, inactiveUsers, usersWithDeposit, usersWithoutDeposit, totalCommission, pendingCommission, paidCommission, conversionRate };
        }));
        return res.json(enriched);
      } catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/agents/') && (p.endsWith('/suspend') || p.endsWith('/ban') || p.endsWith('/reactivate'))) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const status = p.endsWith('/suspend') ? 'suspended' : p.endsWith('/ban') ? 'banned' : 'active'; const a = await prisma.agentProfile.update({ where: { id }, data: { status } }); return res.json(a); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'PUT' && p.startsWith('/api/admin/agents/') && p.endsWith('/force-logout')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const a = await prisma.agentProfile.findUnique({ where: { id } }); if (a) await prisma.userSession.deleteMany({ where: { userId: a.userId } }); return res.json({ success: true }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }
    if (m === 'GET' && p.startsWith('/api/admin/agents/') && !p.includes('/referrals') && !p.includes('/commissions') && !p.endsWith('/force-logout') && !p.endsWith('/reset-code') && !p.endsWith('/reset-password') && !p.endsWith('/suspend') && !p.endsWith('/ban') && !p.endsWith('/reactivate')) {
      try { const u = getTokenUser(); if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin required' }); const id = p.split('/')[4]; const a = await prisma.agentProfile.findUnique({ where: { id }, include: { user: { select: { fullName: true, email: true } } } }); return res.json(a || { error: 'Not found' }); }
      catch { return res.status(500).json({ error: 'Failed' }); }
    }

    // ============ NOT FOUND ============
    return res.status(404).json({ error: 'Route not found', path: p, method: m });

  } catch (error) {
    console.error('=== API ERROR:', error?.message || error, '===');
    if (!res.headersSent) res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

export default async function handler(req, res) {
  app(req, res);
}