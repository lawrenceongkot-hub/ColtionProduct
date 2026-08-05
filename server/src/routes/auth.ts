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
    const { fullName, email, phone, password, referralCode, deviceFingerprint } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields: fullName, email, phone, password' });
    }

    // Check existing
    const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingEmail) return res.status(400).json({ error: 'Email is already registered.' });

    const existingPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingPhone) return res.status(400).json({ error: 'Mobile number is already registered.' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Extract IP address for anti-abuse check
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

    // Generate unique IDs
    const allUsers = await prisma.user.findMany({ select: { displayId: true, invitationCode: true } });
    const existingCodes = allUsers.map((u: any) => u.invitationCode).filter(Boolean);
    const existingDisplayIds = allUsers.map((u: any) => u.displayId).filter(Boolean);

    let invitationCode = generateInvitationCode();
    while (existingCodes.includes(invitationCode)) invitationCode = generateInvitationCode();

    const displayId = generateDisplayId(existingDisplayIds);

    // Validate referral code
    let invitedBy: string | null = null;
    let referrerAgentId: string | null = null;
    if (referralCode) {
      const code = referralCode.trim().toUpperCase();
      const referrerExists = existingCodes.includes(code);
      const agent = await prisma.agentProfile.findUnique({ where: { agentCode: code } });

      if (!referrerExists && !agent) {
        return res.status(400).json({ error: 'Invalid invitation code. Please check and try again.' });
      }
      if (referrerExists) invitedBy = code;
      if (agent) referrerAgentId = agent.id;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/register?ref=${invitationCode}`;

    // Execute all database operations in a single transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create user
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

      // Create wallet
      await tx.wallet.create({
        data: { userId: user.id, main: 0, semWallet: 0, ongoing: 0 },
      });

      // Record registration fingerprint for anti-abuse tracking
      await tx.registrationFingerprint.create({
        data: {
          userId: user.id,
          fullName,
          ipAddress,
          deviceFingerprint: deviceFingerprint || 'unknown',
        },
      });

      // Anti-abuse check: Only block bonus if BOTH IP AND device fingerprint match
      const existingClaim = await tx.welcomeBonusClaim.findFirst({
        where: {
          ipAddress,
          deviceFingerprint: deviceFingerprint || 'unknown',
        },
      });

      const bonusEligible = !existingClaim;

      if (bonusEligible) {
        // Credit SemWallet += 100 (Welcome Bonus)
        await tx.wallet.update({
          where: { userId: user.id },
          data: { semWallet: { increment: 100 } },
        });

        // Create WELCOME_BONUS transaction
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'WELCOME_BONUS',
            amount: 100,
            method: 'Welcome Bonus',
            reference: 'WELCOME-' + user.id.slice(-8) + '-' + Date.now(),
            status: 'SUCCESS',
            completedAt: new Date(),
          },
        });

        // Record welcome bonus claim for anti-abuse tracking
        await tx.welcomeBonusClaim.create({
          data: {
            userId: user.id,
            amount: 100,
            ipAddress,
            deviceFingerprint: deviceFingerprint || 'unknown',
            status: 'CLAIMED',
          },
        });
      }

      // Record referral for user invitation
      if (invitedBy) {
        await tx.referral.create({
          data: {
            inviterCode: invitedBy,
            referredUserId: user.id,
            referredName: fullName,
            referredEmail: email,
            status: 'active',
          },
        });
        // Update inviter's count
        const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
        if (inviter) {
          await tx.user.update({
            where: { id: inviter.id },
            data: { referralCount: inviter.referralCount + 1 },
          });
        }
      }

      // Record agent referral
      if (referrerAgentId) {
        await tx.agentReferral.create({
          data: {
            agentId: referrerAgentId,
            userId: user.id,
            fullName,
            email: email.toLowerCase().trim(),
            status: 'WAITING_DEPOSIT',
          },
        });
        // Update agent referral count
        await tx.agentProfile.update({
          where: { id: referrerAgentId },
          data: { totalReferrals: { increment: 1 } },
        });
      }

      // Generate tokens
      const tokens = generateTokens(user.id, user.email);

      // Create session
      await tx.userSession.create({
        data: {
          userId: user.id,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { user, tokens };
    });

    // Set HttpOnly cookies
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(201).json({
      user: {
        id: result.user.id,
        displayId: result.user.displayId,
        fullName: result.user.fullName,
        email: result.user.email,
        phone: result.user.phone,
        invitationCode: result.user.invitationCode,
        invitationLink: result.user.invitationLink,
        invitedBy: result.user.invitedBy,
        createdAt: result.user.createdAt,
      },
      ...result.tokens,
    });
  } catch (error: any) {
    // Log the COMPLETE error details for debugging
    console.error('========================================');
    console.error('REGISTRATION ERROR - FULL DETAILS:');
    console.error('HTTP Status: 500');
    console.error('Error message:', error?.message || 'Unknown error');
    console.error('Error name:', error?.name || 'Unknown');
    console.error('Stack trace:', error?.stack || 'No stack trace');
    
    // Prisma-specific error details
    if (error?.code) {
      console.error('Prisma error code:', error.code);
    }
    if (error?.meta) {
      console.error('Prisma error meta:', JSON.stringify(error.meta, null, 2));
    }
    if (error?.clientVersion) {
      console.error('Prisma client version:', error.clientVersion);
    }
    
    // Check for Prisma known request errors
    if (error?.name === 'PrismaClientKnownRequestError') {
      console.error('Prisma error type: KnownRequestError');
      console.error('Prisma error code:', error.code);
      console.error('Prisma error meta:', JSON.stringify(error.meta, null, 2));
      
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        // Unique constraint violation
        const target = error.meta?.target || 'unknown field';
        console.error(`Unique constraint failed on: ${target}`);
        return res.status(409).json({ error: `A user with this ${target} already exists.` });
      }
      if (error.code === 'P2003') {
        // Foreign key constraint violation
        console.error('Foreign key constraint failed:', JSON.stringify(error.meta));
        return res.status(400).json({ error: 'Referenced record not found.' });
      }
      if (error.code === 'P2025') {
        // Record not found
        console.error('Record not found:', JSON.stringify(error.meta));
        return res.status(404).json({ error: 'Required record not found.' });
      }
    }
    
    // Check for Prisma validation errors
    if (error?.name === 'PrismaClientValidationError') {
      console.error('Prisma error type: ValidationError');
      console.error('Full validation error:', error.message);
      return res.status(400).json({ error: 'Invalid data provided.' });
    }
    
    // Check for Prisma initialization errors
    if (error?.name === 'PrismaClientInitializationError') {
      console.error('Prisma error type: InitializationError');
      console.error('Error code:', error.errorCode);
      console.error('Full error:', error.message);
      return res.status(503).json({ error: 'Database connection failed. Please try again later.' });
    }
    
    // Check for bcrypt errors
    if (error?.message?.includes('bcrypt')) {
      console.error('Bcrypt error:', error.message);
    }
    
    // Check for JWT errors
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      console.error('JWT error:', error.message);
    }
    
    console.error('========================================');
    
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
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
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
    const { googleId, email, fullName, picture, referralCode, deviceFingerprint } = req.body;
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
        const agent = await prisma.agentProfile.findUnique({ where: { agentCode: code } });

        if (referrerExists) invitedBy = code;
        if (agent) referrerAgentId = agent.id;
      }

      // Extract IP address for anti-abuse check
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

      // Execute all database operations in a single transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
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
        await tx.wallet.create({
          data: { userId: newUser.id, main: 0, semWallet: 0, ongoing: 0 },
        });

        // Record registration fingerprint for anti-abuse tracking
        await tx.registrationFingerprint.create({
          data: {
            userId: newUser.id,
            fullName,
            ipAddress,
            deviceFingerprint: deviceFingerprint || 'unknown',
          },
        });

        // Anti-abuse check: Only block bonus if BOTH IP AND device fingerprint match
        const existingClaim = await tx.welcomeBonusClaim.findFirst({
          where: {
            ipAddress,
            deviceFingerprint: deviceFingerprint || 'unknown',
          },
        });

        const bonusEligible = !existingClaim;

        if (bonusEligible) {
          // Credit SemWallet += 100 (Welcome Bonus)
          await tx.wallet.update({
            where: { userId: newUser.id },
            data: { semWallet: { increment: 100 } },
          });

          // Create WELCOME_BONUS transaction
          await tx.transaction.create({
            data: {
              userId: newUser.id,
              type: 'WELCOME_BONUS',
              amount: 100,
              method: 'Welcome Bonus',
              reference: 'WELCOME-' + newUser.id.slice(-8) + '-' + Date.now(),
              status: 'SUCCESS',
              completedAt: new Date(),
            },
          });

          // Record welcome bonus claim for anti-abuse tracking
          await tx.welcomeBonusClaim.create({
            data: {
              userId: newUser.id,
              amount: 100,
              ipAddress,
              deviceFingerprint: deviceFingerprint || 'unknown',
              status: 'CLAIMED',
            },
          });
        }

        // Record referral
        if (invitedBy) {
          await tx.referral.create({
            data: {
              inviterCode: invitedBy,
              referredUserId: newUser.id,
              referredName: fullName,
              referredEmail: email,
              status: 'active',
            },
          });
          const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
          if (inviter) {
            await tx.user.update({
              where: { id: inviter.id },
              data: { referralCount: inviter.referralCount + 1 },
            });
          }
        }

        // Record agent referral
        if (referrerAgentId) {
          await tx.agentReferral.create({
            data: {
              agentId: referrerAgentId,
              userId: newUser.id,
              fullName,
              email: email.toLowerCase().trim(),
              status: 'WAITING_DEPOSIT',
            },
          });
          await tx.agentProfile.update({
            where: { id: referrerAgentId },
            data: { totalReferrals: { increment: 1 } },
          });
        }

        return newUser;
      });

      user = result;
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
  } catch (error: any) {
    // Log the COMPLETE error details for debugging
    console.error('========================================');
    console.error('GOOGLE AUTH ERROR - FULL DETAILS:');
    console.error('HTTP Status: 500');
    console.error('Error message:', error?.message || 'Unknown error');
    console.error('Error name:', error?.name || 'Unknown');
    console.error('Stack trace:', error?.stack || 'No stack trace');
    
    // Prisma-specific error details
    if (error?.code) {
      console.error('Prisma error code:', error.code);
    }
    if (error?.meta) {
      console.error('Prisma error meta:', JSON.stringify(error.meta, null, 2));
    }
    if (error?.clientVersion) {
      console.error('Prisma client version:', error.clientVersion);
    }
    
    // Check for Prisma known request errors
    if (error?.name === 'PrismaClientKnownRequestError') {
      console.error('Prisma error type: KnownRequestError');
      console.error('Prisma error code:', error.code);
      console.error('Prisma error meta:', JSON.stringify(error.meta, null, 2));
      
      if (error.code === 'P2002') {
        const target = error.meta?.target || 'unknown field';
        console.error(`Unique constraint failed on: ${target}`);
        return res.status(409).json({ error: `A user with this ${target} already exists.` });
      }
      if (error.code === 'P2003') {
        console.error('Foreign key constraint failed:', JSON.stringify(error.meta));
        return res.status(400).json({ error: 'Referenced record not found.' });
      }
      if (error.code === 'P2025') {
        console.error('Record not found:', JSON.stringify(error.meta));
        return res.status(404).json({ error: 'Required record not found.' });
      }
    }
    
    if (error?.name === 'PrismaClientValidationError') {
      console.error('Prisma error type: ValidationError');
      console.error('Full validation error:', error.message);
      return res.status(400).json({ error: 'Invalid data provided.' });
    }
    
    if (error?.name === 'PrismaClientInitializationError') {
      console.error('Prisma error type: InitializationError');
      console.error('Error code:', error.errorCode);
      console.error('Full error:', error.message);
      return res.status(503).json({ error: 'Database connection failed. Please try again later.' });
    }
    
    console.error('========================================');
    
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