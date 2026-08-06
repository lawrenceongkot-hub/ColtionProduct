import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

export const adminAgentsRouter = Router();

// Require admin authentication for all agent management routes
adminAgentsRouter.use(authenticateToken, requireAdmin);

// Get all agents with stats (using raw query to avoid Prisma include issues)
adminAgentsRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    // Fetch all AgentProfile records with their stats
    const agents = await prisma.$queryRaw<any[]>`
      SELECT 
        ap.*,
        u."displayId",
        u."fullName", u."email", u."phone", u."createdAt" as "registrationDate", u."referralCount",
        u."verificationStatus",
        (SELECT COALESCE(COUNT(*), 0) FROM "AgentReferral" ar WHERE ar."agentId" = ap.id) as "totalReferrals",
        (SELECT COALESCE(SUM(ar."firstDeposit"), 0) FROM "AgentReferral" ar WHERE ar."agentId" = ap.id) as "totalDeposits",
        (SELECT COALESCE(SUM(ac."commissionAmount"), 0) FROM "AgentCommission" ac WHERE ac."agentId" = ap.id) as "totalCommission"
      FROM "AgentProfile" ap
      JOIN "User" u ON u.id = ap."userId"
      ORDER BY ap."totalReferrals" DESC
    `;

    // Also fetch users who have referrals (via Referral table) but no AgentProfile yet.
    // These are "eligible" agents who invited users using their invitation code.
    const eligibleUsers = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id as "userId",
        u."displayId",
        u."fullName", u."email", u."phone", u."createdAt" as "registrationDate", u."referralCount",
        u."verificationStatus",
        u."invitationCode" as "agentCode",
        u."invitationLink" as "agentLink",
        (SELECT COALESCE(COUNT(*), 0) FROM "Referral" r WHERE r."inviterCode" = u."invitationCode") as "totalReferrals",
        (SELECT COALESCE(SUM(d."amount"), 0) FROM "Deposit" d 
          JOIN "Referral" r2 ON r2."referredUserId" = d."userId" AND r2."inviterCode" = u."invitationCode"
          WHERE d."status" = 'SUCCESS') as "totalDeposits",
        (SELECT COALESCE(SUM(t."amount"), 0) FROM "Transaction" t 
          WHERE t."userId" = u.id AND t."type" = 'REFERRAL_COMMISSION' AND t."status" = 'SUCCESS') as "totalCommission",
        'active' as "status",
        0 as "qualifiedDeposits",
        (SELECT COALESCE(SUM(t."amount"), 0) FROM "Transaction" t 
          WHERE t."userId" = u.id AND t."type" = 'REFERRAL_COMMISSION' AND t."status" = 'SUCCESS') as "availableBalance",
        0 as "totalCommission",
        0 as "totalReferrals"
      FROM "User" u
      WHERE u."isDemo" = false
        AND u."referralCount" > 0
        AND NOT EXISTS (SELECT 1 FROM "AgentProfile" ap2 WHERE ap2."userId" = u.id)
      ORDER BY u."createdAt" DESC
    `;

    // Merge both lists - AgentProfile records first, then eligible users
    const merged = [...(agents || []), ...(eligibleUsers || [])];
    res.json(merged);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get single agent profile with full details
adminAgentsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const agent = await prisma.agentProfile.findUnique({
      where: { id },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const user = await prisma.user.findUnique({
      where: { id: agent.userId },
      select: {
        id: true, fullName: true, email: true, phone: true,
        displayId: true,
        invitationCode: true, invitationLink: true,
        verificationStatus: true, verifiedAt: true,
        createdAt: true, referralCount: true, totalReferralEarnings: true,
        wallet: { select: { main: true, semWallet: true, ongoing: true } },
      },
    });

    const referrals = await prisma.agentReferral.findMany({
      where: { agentId: id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { registeredDate: 'desc' },
    });

    const commissions = await prisma.agentCommission.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich referrals with totalApprovedDeposits and displayStatus
    const referralUserIds = referrals.map(r => r.userId);
    const depositsForReferrals = referralUserIds.length > 0
      ? await prisma.deposit.findMany({
          where: { userId: { in: referralUserIds }, status: 'SUCCESS' },
          select: { userId: true, amount: true },
        })
      : [];

    const depositMap = new Map<string, number>();
    for (const d of depositsForReferrals) {
      depositMap.set(d.userId, (depositMap.get(d.userId) || 0) + d.amount);
    }

    const enrichedReferrals = referrals.map(r => ({
      ...r,
      totalApprovedDeposits: depositMap.get(r.userId) || 0,
      displayStatus: r.status === 'COMMISSION_PAID' ? 'qualified' : 'waiting_deposit',
    }));

    // Fetch deposits, withdrawals, transactions, and sessions for the agent user
    const [deposits, withdrawals, transactions, sessions] = await Promise.all([
      prisma.deposit.findMany({
        where: { userId: agent.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.withdrawal.findMany({
        where: { userId: agent.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.transaction.findMany({
        where: { userId: agent.userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.userSession.findMany({
        where: { userId: agent.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const totalDeposits = referrals.reduce((sum, r) => sum + (r.firstDeposit || 0), 0);
    const firstDeposits = referrals.filter(r => r.firstDeposit !== null).length;
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
      status: agent.status,
      user,
      referrals: enrichedReferrals,
      commissions,
      deposits,
      withdrawals,
      transactions,
      sessions,
      stats: {
        totalDeposits,
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
    const agentId = req.params.id as string;
    const referrals = await prisma.agentReferral.findMany({
      where: { agentId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { registeredDate: 'desc' },
    });

    // Enrich referrals with totalApprovedDeposits and displayStatus
    const referralUserIds = referrals.map(r => r.userId);
    const deposits = referralUserIds.length > 0
      ? await prisma.deposit.findMany({
          where: { userId: { in: referralUserIds }, status: 'SUCCESS' },
          select: { userId: true, amount: true },
        })
      : [];

    const depositMap = new Map<string, number>();
    for (const d of deposits) {
      depositMap.set(d.userId, (depositMap.get(d.userId) || 0) + d.amount);
    }

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

// Get agent commissions
adminAgentsRouter.get('/:id/commissions', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const commissions = await prisma.agentCommission.findMany({
      where: { agentId },
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
    const id = req.params.id as string;
    await prisma.agentProfile.update({
      where: { id },
      data: { status: 'suspended' },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to suspend agent' });
  }
});

// Ban agent
adminAgentsRouter.put('/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.agentProfile.update({
      where: { id },
      data: { status: 'banned' },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to ban agent' });
  }
});

// Reactivate agent
adminAgentsRouter.put('/:id/reactivate', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.agentProfile.update({
      where: { id },
      data: { status: 'active' },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to reactivate agent' });
  }
});

// Force logout agent
adminAgentsRouter.put('/:id/force-logout', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const agent = await prisma.agentProfile.findUnique({ where: { id } });
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
    const id = req.params.id as string;
    const agent = await prisma.agentProfile.findUnique({ where: { id } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = 'AGT';
    for (let i = 0; i < 7; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

    let existing = await prisma.agentProfile.findUnique({ where: { agentCode: newCode } });
    while (existing) {
      newCode = 'AGT';
      for (let i = 0; i < 7; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
      existing = await prisma.agentProfile.findUnique({ where: { agentCode: newCode } });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await prisma.agentProfile.update({
      where: { id },
      data: { agentCode: newCode, agentLink: baseUrl + '/register?ref=' + newCode },
    });

    res.json({ success: true, agentCode: newCode });
  } catch {
    res.status(500).json({ error: 'Failed to reset code' });
  }
});

// Reset agent password
adminAgentsRouter.put('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const agent = await prisma.agentProfile.findUnique({ where: { id } });
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