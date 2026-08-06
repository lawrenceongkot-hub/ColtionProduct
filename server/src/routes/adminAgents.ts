import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

export const adminAgentsRouter = Router();

// Require admin authentication for all agent management routes
adminAgentsRouter.use(authenticateToken, requireAdmin);

// Get all agents with stats
// BUSINESS RULE: A user automatically becomes an Agent when they have at least ONE successful invited registration.
// Agents are derived from the Referral table - NO AgentProfile required, NO manual creation.
adminAgentsRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    // Build agent list directly from the Referral table.
    // Every user who has invited at least one registered user appears automatically.
    const agents = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id AS "id",
        u.id AS "userId",
        u."displayId",
        u."fullName",
        u."email",
        u."phone",
        u."createdAt" AS "registrationDate",
        u."referralCount",
        u."invitationCode" AS "agentCode",
        u."invitationLink" AS "agentLink",
        u."status",
        u."verificationStatus",
        -- Total referrals = count of Referral records where this user's invitation code was used
        (SELECT COALESCE(COUNT(*), 0) FROM "Referral" r WHERE r."inviterCode" = u."invitationCode") AS "totalReferrals",
        -- Valid Referrals = referrals with active referred users
        (SELECT COALESCE(COUNT(*), 0) FROM "Referral" r 
          JOIN "User" ru ON ru.id = r."referredUserId"
          WHERE r."inviterCode" = u."invitationCode" AND ru."status" = 'active') AS "validReferrals",
        -- Successful Deposits = referred users who made at least one SUCCESS deposit
        (SELECT COALESCE(COUNT(DISTINCT d."userId"), 0) FROM "Deposit" d 
          JOIN "Referral" r2 ON r2."referredUserId" = d."userId" AND r2."inviterCode" = u."invitationCode"
          WHERE d."status" = 'SUCCESS') AS "successfulDeposits",
        -- Total Referral Deposits = sum of all SUCCESS deposits from referred users
        (SELECT COALESCE(SUM(d2."amount"), 0) FROM "Deposit" d2 
          JOIN "Referral" r3 ON r3."referredUserId" = d2."userId" AND r3."inviterCode" = u."invitationCode"
          WHERE d2."status" = 'SUCCESS') AS "totalDeposits",
        -- Commission Earned = sum of REFERRAL_COMMISSION transactions
        (SELECT COALESCE(SUM(t."amount"), 0) FROM "Transaction" t 
          WHERE t."userId" = u.id AND t."type" = 'REFERRAL_COMMISSION' AND t."status" = 'SUCCESS') AS "totalCommission",
        -- Available Balance from Main Wallet
        w."main" AS "availableBalance",
        -- Qualified Deposits (deposited referrals count)
        (SELECT COALESCE(COUNT(DISTINCT d3."userId"), 0) FROM "Deposit" d3 
          JOIN "Referral" r4 ON r4."referredUserId" = d3."userId" AND r4."inviterCode" = u."invitationCode"
          WHERE d3."status" = 'SUCCESS') AS "qualifiedDeposits"
      FROM "User" u
      LEFT JOIN "Wallet" w ON w."userId" = u.id
      WHERE u."isDemo" = false
        -- Only users who have at least ONE referenced registration
        AND EXISTS (SELECT 1 FROM "Referral" r5 WHERE r5."inviterCode" = u."invitationCode")
      ORDER BY u."createdAt" DESC
    `;

    // Convert BigInt values to numbers (PostgreSQL COUNT/SUM return BigInt)
    const serialized = (agents || []).map((a: any) => {
      const result: any = {};
      for (const [key, value] of Object.entries(a)) {
        result[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return result;
    });

    res.json(serialized);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get single agent profile with full details
adminAgentsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Find the agent user by ID (not via AgentProfile)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, displayId: true, fullName: true, email: true, phone: true,
        invitationCode: true, invitationLink: true, status: true,
        verificationStatus: true, verifiedAt: true,
        createdAt: true, referralCount: true, totalReferralEarnings: true,
        wallet: { select: { main: true, semWallet: true, ongoing: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Agent not found' });

    // Get all referrals where this user's invitation code was used
    const referrals = await prisma.referral.findMany({
      where: { inviterCode: user.invitationCode },
      include: {
        referredUser: { select: { id: true, fullName: true, email: true, status: true, createdAt: true } },
      },
      orderBy: { joinedDate: 'desc' },
    });

    // Fetch SUCCESS commissions/transactions for this agent
    const commissions = await prisma.transaction.findMany({
      where: { userId: user.id, type: 'REFERRAL_COMMISSION', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich referrals with totalApprovedDeposits and displayStatus
    const referralUserIds = referrals.map(r => r.referredUserId);
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
      id: r.id,
      userId: r.referredUserId,
      fullName: r.referredName,
      email: r.referredEmail,
      registeredDate: r.joinedDate,
      totalApprovedDeposits: depositMap.get(r.referredUserId) || 0,
      displayStatus: r.status === 'COMMISSION_PAID' ? 'qualified' : 'waiting_deposit',
    }));

    // Fetch deposits, withdrawals, transactions, and sessions for the agent user
    const [deposits, withdrawals, transactions, sessions] = await Promise.all([
      prisma.deposit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.withdrawal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.userSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const totalDeposits = referrals.reduce((sum, r) => sum + (depositMap.get(r.referredUserId) || 0), 0);
    const firstDeposits = referrals.filter(r => depositMap.get(r.referredUserId) || 0 > 0).length;
    const conversionRate = referrals.length > 0 ? (firstDeposits / referrals.length) * 100 : 0;
    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

    res.json({
      id: user.id,
      userId: user.id,
      agentCode: user.invitationCode,
      agentLink: user.invitationLink,
      totalCommission,
      totalReferrals: referrals.length,
      qualifiedDeposits: firstDeposits,
      availableBalance: user.wallet?.main || 0,
      status: user.status,
      user: {
        ...user,
        wallet: user.wallet,
      },
      referrals: enrichedReferrals,
      commissions: commissions.map(c => ({
        id: c.id,
        agentId: user.id,
        referredUserId: c.userId,
        referredName: c.method?.replace('Referral Commission - ', '') || '',
        depositAmount: 0,
        commissionRate: 0,
        commissionAmount: c.amount,
        createdAt: c.createdAt,
      })),
      deposits,
      withdrawals,
      transactions,
      sessions,
      stats: {
        totalDeposits,
        totalDepositsGenerated: totalDeposits,
        firstDeposits,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingCommission: 0,
        paidCommission: totalCommission,
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
    const agentUserId = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: agentUserId } });
    if (!user) return res.status(404).json({ error: 'Agent not found' });

    const referrals = await prisma.referral.findMany({
      where: { inviterCode: user.invitationCode },
      include: {
        referredUser: { select: { id: true, fullName: true, email: true, status: true } },
      },
      orderBy: { joinedDate: 'desc' },
    });

    // Enrich referrals with totalApprovedDeposits and displayStatus
    const referralUserIds = referrals.map(r => r.referredUserId);
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
      totalApprovedDeposits: depositMap.get(r.referredUserId) || 0,
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
    const agentUserId = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: agentUserId } });
    if (!user) return res.status(404).json({ error: 'Agent not found' });

    const commissions = await prisma.transaction.findMany({
      where: { userId: user.id, type: 'REFERRAL_COMMISSION', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    res.json(commissions);
  } catch {
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// Update agent status (suspend/ban/reactivate)
adminAgentsRouter.put('/:id/:action', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const action = req.params.action as string;

    const statusMap: Record<string, string> = {
      suspend: 'suspended',
      ban: 'banned',
      reactivate: 'active',
    };

    if (!statusMap[action]) return res.status(400).json({ error: 'Invalid action' });

    await prisma.user.update({
      where: { id },
      data: { status: statusMap[action] },
    });

    if (action === 'ban') {
      await prisma.userSession.deleteMany({ where: { userId: id } });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Force logout agent
adminAgentsRouter.put('/:id/force-logout', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.userSession.deleteMany({ where: { userId: id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to force logout' });
  }
});

// Reset invitation code
adminAgentsRouter.put('/:id/reset-code', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Agent not found' });

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = '';
    for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

    let existing = await prisma.user.findUnique({ where: { invitationCode: newCode } });
    while (existing) {
      newCode = '';
      for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
      existing = await prisma.user.findUnique({ where: { invitationCode: newCode } });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await prisma.user.update({
      where: { id },
      data: { invitationCode: newCode, invitationLink: baseUrl + '/register?ref=' + newCode },
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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Agent not found' });

    const newPassword = 'Coltion' + Math.random().toString(36).slice(-6).toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, newPassword });
  } catch {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});