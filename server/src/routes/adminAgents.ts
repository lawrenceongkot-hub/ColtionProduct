import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const adminAgentsRouter = Router();

// Get all agents with stats
adminAgentsRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.agentProfile.findMany({
      orderBy: { totalReferrals: 'desc' },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            createdAt: true, referralCount: true,
          },
        },
        referrals: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        commissions: true,
      },
    });

    const result = agents.map(agent => {
      const totalDeposits = agent.referrals.reduce((sum, r) => sum + (r.firstDeposit || 0), 0);
      const activeReferrals = agent.referrals.filter(r => r.status === 'COMMISSION_PAID').length;
      const pendingCommissions = agent.commissions
        .filter(c => c.commissionAmount > 0)
        .reduce((sum, c) => sum + c.commissionAmount, 0);
      const paidCommissions = agent.totalCommission;

      return {
        id: agent.id,
        userId: agent.userId,
        agentCode: agent.agentCode,
        agentLink: agent.agentLink,
        fullName: agent.user.fullName,
        email: agent.user.email,
        phone: agent.user.phone || '',
        status: (agent as any).status || 'active',
        registrationDate: agent.user.createdAt,
        totalInvitedUsers: agent.totalReferrals,
        activeReferrals,
        totalDepositsGenerated: totalDeposits,
        totalReferralCommission: agent.totalCommission,
        pendingCommission: pendingCommissions - paidCommissions,
        paidCommission: paidCommissions,
        availableCommissionWallet: agent.availableBalance,
        lastCommissionDate: agent.commissions.length > 0
          ? agent.commissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : null,
        lastLogin: null,
        referralCount: agent.user.referralCount,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get single agent profile with full details
adminAgentsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true,
            invitationCode: true, invitationLink: true,
            createdAt: true, referralCount: true, totalReferralEarnings: true,
          },
        },
        referrals: {
          include: {
            user: {
              select: {
                id: true, fullName: true, email: true,
                orders: { select: { vipName: true, status: true } },
              },
            },
          },
          orderBy: { registeredDate: 'desc' },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const totalDeposits = agent.referrals.reduce((sum, r) => sum + (r.firstDeposit || 0), 0);
    const firstDeposits = agent.referrals.filter(r => r.firstDeposit !== null).length;
    const conversionRate = agent.totalReferrals > 0 ? (firstDeposits / agent.totalReferrals) * 100 : 0;

    res.json({
      id: agent.id,
      userId: agent.userId,
      agentCode: agent.agentCode,
      agentLink: agent.agentLink,
      totalCommission: agent.totalCommission,
      totalReferrals: agent.totalReferrals,
      qualifiedDeposits: agent.qualifiedDeposits,
      availableBalance: agent.availableBalance,
      status: (agent as any).status || 'active',
      user: agent.user,
      referrals: agent.referrals,
      commissions: agent.commissions,
      stats: {
        totalDepositsGenerated: totalDeposits,
        firstDeposits,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingCommission: agent.totalCommission - agent.availableBalance,
        paidCommission: agent.availableBalance,
      },
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Get agent referrals
adminAgentsRouter.get('/:id/referrals', async (req: AuthRequest, res: Response) => {
  try {
    const referrals = await prisma.agentReferral.findMany({
      where: { agentId: req.params.id },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true,
            orders: { select: { vipName: true, status: true } },
          },
        },
      },
      orderBy: { registeredDate: 'desc' },
    });

    res.json(referrals);
  } catch {
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});

// Get agent commissions
adminAgentsRouter.get('/:id/commissions', async (req: AuthRequest, res: Response) => {
  try {
    const commissions = await prisma.agentCommission.findMany({
      where: { agentId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(commissions);
  } catch {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// Suspend agent
adminAgentsRouter.put('/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agentProfile.update({
      where: { id: req.params.id },
      data: { status: 'suspended' as any },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to suspend agent' });
  }
});

// Ban agent
adminAgentsRouter.put('/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agentProfile.update({
      where: { id: req.params.id },
      data: { status: 'banned' as any },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to ban agent' });
  }
});

// Reactivate agent
adminAgentsRouter.put('/:id/reactivate', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.agentProfile.update({
      where: { id: req.params.id },
      data: { status: 'active' as any },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to reactivate agent' });
  }
});

// Force logout agent (delete all sessions for the agent's user)
adminAgentsRouter.put('/:id/force-logout', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    await prisma.userSession.deleteMany({ where: { userId: agent.userId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to force logout' });
  }
});

// Reset invitation code
adminAgentsRouter.put('/:id/reset-code', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = 'AGT';
    for (let i = 0; i < 7; i++) {
      newCode += chars[Math.floor(Math.random() * chars.length)];
    }

    // Ensure uniqueness
    let existing = await prisma.agentProfile.findUnique({ where: { agentCode: newCode } });
    while (existing) {
      newCode = 'AGT';
      for (let i = 0; i < 7; i++) {
        newCode += chars[Math.floor(Math.random() * chars.length)];
      }
      existing = await prisma.agentProfile.findUnique({ where: { agentCode: newCode } });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await prisma.agentProfile.update({
      where: { id: req.params.id },
      data: { agentCode: newCode, agentLink: `${baseUrl}/register?ref=${newCode}` },
    });

    res.json({ success: true, agentCode: newCode });
  } catch {
    res.status(500).json({ error: 'Failed to reset code' });
  }
});

// Reset agent password
adminAgentsRouter.put('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await prisma.agentProfile.findUnique({ where: { id: req.params.id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const newPassword = 'Coltion' + Math.random().toString(36).slice(-6).toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: agent.userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true, newPassword });
  } catch {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});