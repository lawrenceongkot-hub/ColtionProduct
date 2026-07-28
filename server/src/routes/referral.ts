import { Router, Response } from 'express';
import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const referralRouter = Router();

referralRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const referrals = await prisma.referral.findMany({
      where: { inviterCode: user.invitationCode },
      orderBy: { joinedDate: 'desc' },
      take: 10,
    });

    // Calculate total earnings from referral commissions
    const commissions = await prisma.agentCommission.findMany({
      where: { referredUserId: req.user!.id },
    });
    const totalEarnings = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    res.json({
      referralCount: referrals.length,
      totalEarnings,
      recentReferrals: referrals.map(r => ({
        id: r.referredUserId,
        fullName: r.referredName,
        email: r.referredEmail,
        joinedDate: r.joinedDate,
        status: r.status,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});