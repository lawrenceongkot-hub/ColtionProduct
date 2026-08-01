import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const verificationRouter = Router();

/**
 * Generate a unique 8-12 character uppercase alphanumeric verification code.
 * Only called by the backend — never on the frontend.
 */
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8 + Math.floor(Math.random() * 5); // 8-12 chars
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET /api/verification
 * Returns the user's current verification status and code (if one exists).
 * Never generates a new code — only reads from the database.
 */
verificationRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        phone: true,
        verificationCode: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationRequestedAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      userId: user.id,
      email: user.email,
      mobileNumber: user.phone,
      verificationCode: user.verificationCode,
      status: user.verificationStatus,
      verifiedAt: user.verifiedAt,
      requestedAt: user.verificationRequestedAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

/**
 * POST /api/verification
 * Generates a permanent verification code and stores it in the User table.
 * If a code already exists, returns the existing code — never regenerates.
 */
verificationRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    // Get current user
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate email exists
    if (!user.email) {
      return res.status(400).json({ error: 'Email is required for verification.' });
    }

    // Determine the mobile number to use
    let finalMobile = mobileNumber || user.phone || '';

    // Validate mobile number format (Philippine format: 11 digits starting with 09)
    if (!finalMobile) {
      return res.status(400).json({ error: 'Mobile number is required for verification.' });
    }
    if (!/^09\d{9}$/.test(finalMobile)) {
      return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g., 09171234567).' });
    }

    // Check for duplicate mobile number (another user already has this number)
    if (finalMobile !== user.phone) {
      const duplicate = await prisma.user.findFirst({
        where: { phone: finalMobile, id: { not: user.id } },
      });
      if (duplicate) {
        return res.status(400).json({ error: 'This mobile number is already registered to another account.' });
      }
    }

    // If a verification code already exists, return it — never regenerate
    if (user.verificationCode) {
      // Update mobile number if it changed
      if (finalMobile !== user.phone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone: finalMobile },
        });
      }
      return res.json({
        userId: user.id,
        email: user.email,
        mobileNumber: finalMobile,
        verificationCode: user.verificationCode,
        status: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        requestedAt: user.verificationRequestedAt,
        message: 'Existing verification code returned.',
      });
    }

    // Generate a unique code (server-side only)
    let code = generateVerificationCode();
    // Ensure uniqueness in the database
    let existing = await prisma.user.findUnique({ where: { verificationCode: code } });
    while (existing) {
      code = generateVerificationCode();
      existing = await prisma.user.findUnique({ where: { verificationCode: code } });
    }

    // Save the permanent code to the User table
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: finalMobile,
        verificationCode: code,
        verificationStatus: 'PENDING',
        verificationRequestedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        verificationCode: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationRequestedAt: true,
      },
    });

    res.json({
      userId: updated.id,
      email: updated.email,
      mobileNumber: updated.phone,
      verificationCode: updated.verificationCode,
      status: updated.verificationStatus,
      verifiedAt: updated.verifiedAt,
      requestedAt: updated.verificationRequestedAt,
      message: 'Verification code generated.',
    });
  } catch (error: any) {
    console.error('Verification code generation error:', error?.message || error);
    res.status(500).json({ error: 'Failed to generate verification code' });
  }
});

/**
 * POST /api/verification/verify
 * Admin-only: approves or rejects a user's verification.
 */
verificationRouter.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'APPROVE') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
      });
      return res.json({ success: true, status: 'APPROVED' });
    }

    if (action === 'REJECT') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationStatus: 'REJECTED',
        },
      });
      return res.json({ success: true, status: 'REJECTED' });
    }

    return res.status(400).json({ error: 'Invalid action. Use APPROVE or REJECT.' });
  } catch {
    res.status(500).json({ error: 'Verification update failed' });
  }
});