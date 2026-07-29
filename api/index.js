/**
 * Vercel Serverless Function - Self-contained Express app
 * ESM version - matches root package.json "type": "module"
 */
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: () => true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(400).json({ error: 'Email is already registered.' });
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
    const invitationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
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
    
    await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
    
    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
    
    res.status(201).json({ user: { id: user.id, displayId, fullName, email, phone, invitationCode, createdAt: user.createdAt }, accessToken, refreshToken });
  } catch (error) {
    console.error('Registration error:', error?.message || error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase()?.trim() } });
    if (!user) return res.status(400).json({ error: 'No account found with this email.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Incorrect password.' });
    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
    res.json({ user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, phone: user.phone, invitationCode: user.invitationCode, createdAt: user.createdAt }, accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error?.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleId, email, fullName, picture } = req.body;
    if (!googleId || !email || !fullName) return res.status(400).json({ error: 'Missing required Google user data' });
    
    let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] } });
    
    if (!user) {
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
      await prisma.wallet.create({ data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 } });
    }
    
    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh', { expiresIn: '7d' });
    
    res.json({ user: { id: user.id, displayId: user.displayId, fullName: user.fullName, email: user.email, invitationCode: user.invitationCode, createdAt: user.createdAt }, accessToken, refreshToken, isNew: true });
  } catch (error) {
    console.error('Google auth error:', error?.message);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

export default app;