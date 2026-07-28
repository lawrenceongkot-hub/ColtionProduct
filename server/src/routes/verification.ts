import { Router, Response } from 'express';
import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const verificationRouter = Router();

verificationRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { email, mobileNumber } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const request = await prisma.verificationRequest.create({
      data: {
        userId: req.user!.id,
        email,
        mobileNumber,
        verificationCode: code,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({ id: request.id, message: 'Verification code sent' });
  } catch {
    res.status(500).json({ error: 'Failed to create verification' });
  }
});

verificationRouter.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const request = await prisma.verificationRequest.findFirst({
      where: { userId: req.user!.id, verificationCode: code, status: 'PENDING' },
    });

    if (!request) return res.status(400).json({ error: 'Invalid verification code' });
    if (new Date() > request.expiresAt) return res.status(400).json({ error: 'Verification code expired' });

    await prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED' },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Verification failed' });
  }
});