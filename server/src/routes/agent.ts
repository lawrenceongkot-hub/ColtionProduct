import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const agentRouter = Router();

function generateAgentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AGT';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

agentRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    let agent = await prisma.agentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!agent) {
      const code = generateAgentCode();
      const existing = await prisma.agentProfile.findUnique({ where: { agentCode: code } });
      let finalCode = code;
      while (existing) {
        finalCode = generateAgentCode();
      }
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      agent = await prisma.agentProfile.create({
        data: {
          userId: req.user!.id,
          agentCode: finalCode,
          agentLink: `${baseUrl}/register?ref=${finalCode}`,
        },
      });
    }
    res.json(agent);
  } catch {
    res.status(500).json({ error: 'Failed to get agent profile' });
  }
});

agentRouter.get('/referrals', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!agent) return res.json([]);

    const referrals = await prisma.agentReferral.findMany({
      where: { agentId: agent.id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { registeredDate: 'desc' },
    });

    // Batch fetch approved deposits for all referred users
    const referredUserIds = referrals.map(r => r.userId);
    const deposits = referredUserIds.length > 0
      ? await prisma.deposit.findMany({
          where: { userId: { in: referredUserIds }, status: 'SUCCESS' },
          select: { userId: true, amount: true },
        })
      : [];

    // Aggregate total approved deposits per user
    const depositMap = new Map<string, number>();
    for (const d of deposits) {
      depositMap.set(d.userId, (depositMap.get(d.userId) || 0) + d.amount);
    }

    // Enrich referrals with totalApprovedDeposits and displayStatus
    const enriched = referrals.map(r => ({
      ...r,
      totalApprovedDeposits: depositMap.get(r.userId) || 0,
      displayStatus: r.status === 'COMMISSION_PAID' ? 'qualified' : 'waiting_deposit',
    }));

    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});

agentRouter.get('/commissions', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!agent) return res.json([]);

    const commissions = await prisma.agentCommission.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(commissions);
  } catch {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});
