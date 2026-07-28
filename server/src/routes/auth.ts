import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { generateTokens } from '../middleware/auth';
import { AuthRequest, authenticateToken } from '../middleware/auth';

export const authRouter = Router();

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateDisplayId(existingIds: string[]): string {
  let id: string;
  do {
    id = '';
    for (let i = 0; i < 10; i++) {
      id += Math.floor(Math.random() * 10).toString();
    }
  } while (existingIds.includes(id));
  return id;
}

// Register
authRouter.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, phone, password, referralCode } = req.body;

    // Check existing
    const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered.' });

    const existingPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingPhone) return res.status(400).json({ error: 'Mobile number is already registered.' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique IDs
    const allUsers = await prisma.user.findMany({ select: { displayId: true, invitationCode: true } });
    const existingCodes = allUsers.map((u: any) => u.invitationCode).filter(Boolean);
    const existingDisplayIds = allUsers.map((u: any) => u.displayId).filter(Boolean);

    let invitationCode = generateInvitationCode();
    while (existingCodes.includes(invitationCode)) invitationCode = generateInvitationCode();

    const displayId = generateDisplayId(existingDisplayIds);

    // Validate referral code
    let invitedBy: string | null = null;
    if (referralCode) {
      const code = referralCode.trim().toUpperCase();
      const referrerExists = existingCodes.includes(code);
      const agentExists = await prisma.agentProfile.findUnique({ where: { agentCode: code } });

      if (!referrerExists && !agentExists) {
        return res.status(400).json({ error: 'Invalid invitation code. Please check and try again.' });
      }
      if (referrerExists) invitedBy = code;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/register?ref=${invitationCode}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        displayId,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName,
        phone,
        invitationCode,
        invitationLink,
        invitedBy,
        referralCount: 0,
        totalReferralEarnings: 0,
      },
    });

    // Create wallet
    await prisma.wallet.create({
      data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 },
    });

    // Record referral for user invitation
    if (invitedBy) {
      await prisma.referral.create({
        data: {
          inviterCode: invitedBy,
          referredUserId: user.id,
          referredName: fullName,
          referredEmail: email,
          status: 'active',
        },
      });
      // Update inviter's count
      const inviter = await prisma.user.findFirst({ where: { invitationCode: invitedBy } });
      if (inviter) {
        await prisma.user.update({
          where: { id: inviter.id },
          data: { referralCount: inviter.referralCount + 1 },
        });
      }
    }

    // Record agent referral
    if (referralCode) {
      const code = referralCode.trim().toUpperCase();
      const agent = await prisma.agentProfile.findUnique({ where: { agentCode: code } });
      if (agent) {
        await prisma.agentReferral.create({
          data: {
            agentId: agent.id,
            userId: user.id,
            fullName,
            email: email.toLowerCase().trim(),
            status: 'WAITING_DEPOSIT',
          },
        });
        // Link user to agent
        await prisma.user.update({
          where: { id: user.id },
          data: { referrerAgentId: agent.id },
        });
        // Update agent referral count
        await prisma.agentProfile.update({
          where: { id: agent.id },
          data: { totalReferrals: { increment: 1 } },
        });
      }
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set HttpOnly cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.status(201).json({
      user: {
        id: user.id,
        displayId: user.displayId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        invitationCode: user.invitationCode,
        invitationLink: user.invitationLink,
        invitedBy: user.invitedBy,
        createdAt: user.createdAt,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.status(400).json({ error: 'No account found with this email address.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect password. Please try again.' });

    const tokens = generateTokens(user.id, user.email);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        displayId: user.displayId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        invitationCode: user.invitationCode,
        invitationLink: user.invitationLink,
        invitedBy: user.invitedBy,
        referralCount: user.referralCount,
        totalReferralEarnings: user.totalReferralEarnings,
        picture: user.picture,
        createdAt: user.createdAt,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
authRouter.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret') as any;

    const session = await prisma.userSession.findFirst({
      where: { refreshToken, userId: decoded.id },
    });

    if (!session) return res.status(403).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(decoded.id, decoded.email);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: tokens.accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json(tokens);
  } catch {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
authRouter.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.userSession.deleteMany({ where: { userId: req.user!.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Google OAuth login/register
authRouter.post('/google', async (req: AuthRequest, res: Response) => {
  try {
    const { googleId, email, fullName, picture, referralCode } = req.body;
    if (!googleId || !email || !fullName) {
      return res.status(400).json({ error: 'Missing required Google user data' });
    }

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase().trim() }] },
    });

    let isNew = false;

    if (!user) {
      // Generate unique IDs
      const allUsers = await prisma.user.findMany({ select: { displayId: true, invitationCode: true } });
      const existingCodes = allUsers.map((u: any) => u.invitationCode).filter(Boolean);
      const existingDisplayIds = allUsers.map((u: any) => u.displayId).filter(Boolean);

      let invitationCode = generateInvitationCode();
      while (existingCodes.includes(invitationCode)) invitationCode = generateInvitationCode();
      const displayId = generateDisplayId(existingDisplayIds);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const invitationLink = `${baseUrl}/register?ref=${invitationCode}`;

      // Validate referral code
      let invitedBy: string | null = null;
      let referrerAgentId: string | null = null;
      if (referralCode) {
        const code = referralCode.trim().toUpperCase();
        const referrerExists = existingCodes.includes(code);
        const agentExists = await prisma.agentProfile.findUnique({ where: { agentCode: code } });

        if (referrerExists) invitedBy = code;
        if (agentExists) {
          const agent = await prisma.agentProfile.findUnique({ where: { agentCode: code } });
          if (agent) referrerAgentId = agent.id;
        }
      }

      // Create user
      user = await prisma.user.create({
        data: {
          displayId,
          email: email.toLowerCase().trim(),
          password: 'google_oauth_' + Date.now(),
          fullName,
          phone: '',
          picture: picture || '',
          googleId,
          invitationCode,
          invitationLink,
          invitedBy,
          referrerAgentId,
          referralCount: 0,
          totalReferralEarnings: 0,
        },
      });

      // Create wallet
      await prisma.wallet.create({
        data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 },
      });

      // Record referral
      if (invitedBy) {
        await prisma.referral.create({
          data: {
            inviterCode: invitedBy,
            referredUserId: user.id,
            referredName: fullName,
            referredEmail: email,
            status: 'active',
          },
        });
        const inviter = await prisma.user.findFirst({ where: { invitationCode: invitedBy } });
        if (inviter) {
          await prisma.user.update({
            where: { id: inviter.id },
            data: { referralCount: inviter.referralCount + 1 },
          });
        }
      }

      // Record agent referral
      if (referrerAgentId) {
        await prisma.agentReferral.create({
          data: {
            agentId: referrerAgentId,
            userId: user.id,
            fullName,
            email: email.toLowerCase().trim(),
            status: 'WAITING_DEPOSIT',
          },
        });
      }

      isNew = true;
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        displayId: user.displayId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        picture: user.picture,
        invitationCode: user.invitationCode,
        invitationLink: user.invitationLink,
        invitedBy: user.invitedBy,
        referralCount: user.referralCount,
        totalReferralEarnings: user.totalReferralEarnings,
        createdAt: user.createdAt,
      },
      ...tokens,
      isNew,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Get current user
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, displayId: true, fullName: true, email: true, phone: true,
        invitationCode: true, invitationLink: true, invitedBy: true,
        referralCount: true, totalReferralEarnings: true, picture: true,
        googleId: true, createdAt: true,
        wallet: { select: { main: true, semWallet: true, ongoing: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
});