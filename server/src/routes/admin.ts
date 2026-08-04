import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';

export const adminRouter = Router();

// Admin Login
adminRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (!admin) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({ token, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected admin routes
adminRouter.use(authenticateToken, requireAdmin);

adminRouter.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // CRITICAL: All production analytics EXCLUDE demo accounts (users.isDemo = true)
    const [users, deposits, withdrawals, orders, transactions, activeSessions, newUsersToday, verifiedUsers, pendingVerification, suspendedBanned, welcomeBonuses, referralCommissions, walletBalance, activeVIP, investedAmount, dailyProfit, completingToday, runningPlans, pendingDeposits, pendingWithdrawals, pendingKYC, failedTx, supportTickets] = await Promise.all([
      prisma.user.count({ where: { isDemo: false } }),
      prisma.deposit.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', user: { isDemo: false } } }),
      prisma.withdrawal.aggregate({ _sum: { netAmount: true }, where: { status: 'SUCCESS', user: { isDemo: false } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', user: { isDemo: false } } }),
      prisma.transaction.count({ where: { user: { isDemo: false } } }),
      prisma.userSession.count({ where: { expiresAt: { gte: new Date() }, user: { isDemo: false } } }),
      prisma.user.count({ where: { createdAt: { gte: today }, isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: 'APPROVED', isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: 'PENDING', isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: { in: ['SUSPENDED', 'BANNED'] }, isDemo: false } }),
      prisma.welcomeBonusClaim.aggregate({ _sum: { amount: true }, where: { user: { isDemo: false } } }),
      prisma.agentCommission.aggregate({ _sum: { commissionAmount: true }, where: { user: { isDemo: false, agentProfile: { isNot: null } } } }),
      prisma.wallet.aggregate({ _sum: { main: true, semWallet: true, ongoing: true }, where: { user: { isDemo: false } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', user: { isDemo: false } } }),
      prisma.investmentOrder.aggregate({ _sum: { buyAmount: true }, where: { status: 'ACTIVE', user: { isDemo: false } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'DAILY_PROFIT', createdAt: { gte: today }, user: { isDemo: false } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', completedDays: { gte: 29 }, user: { isDemo: false } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', user: { isDemo: false } } }),
      prisma.deposit.count({ where: { status: 'PENDING', user: { isDemo: false } } }),
      prisma.withdrawal.count({ where: { status: 'PENDING', user: { isDemo: false } } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING', user: { isDemo: false } } }),
      prisma.transaction.count({ where: { status: 'FAILED', user: { isDemo: false } } }),
      prisma.notification.count({ where: { read: false, user: { isDemo: false } } }),
    ]);

    const totalWalletBalance = (walletBalance._sum.main || 0) + (walletBalance._sum.semWallet || 0) + (walletBalance._sum.ongoing || 0);
    const totalDeposits = deposits._sum.amount || 0;
    const totalWithdrawals = withdrawals._sum.netAmount || 0;

    res.json({
      totalUsers: users,
      onlineUsers: activeSessions,
      newUsersToday,
      verifiedUsers,
      pendingVerification,
      suspendedBanned,
      totalDeposits,
      totalWithdrawals,
      netRevenue: totalDeposits - totalWithdrawals,
      totalWelcomeBonuses: welcomeBonuses._sum.amount || 0,
      totalReferralCommissions: referralCommissions._sum.commissionAmount || 0,
      totalWalletBalance,
      activeVIPMembers: activeVIP,
      activeInvestmentOrders: orders,
      totalInvestedAmount: investedAmount._sum.buyAmount || 0,
      dailyProfitDistributedToday: dailyProfit._sum.amount || 0,
      investmentsCompletingToday: completingToday,
      runningInvestmentPlans: runningPlans,
      pendingDeposits,
      pendingWithdrawals,
      pendingKYC,
      failedTransactions: failedTx,
      pendingSupportRequests: supportTickets,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

adminRouter.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, displayId: true, fullName: true, email: true, phone: true,
        invitationCode: true, referralCount: true, createdAt: true,
        wallet: { select: { main: true } },
      },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

adminRouter.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

adminRouter.get('/deposits', async (_req: AuthRequest, res: Response) => {
  try {
    const deposits = await prisma.deposit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
    res.json(deposits);
  } catch {
    res.status(500).json({ error: 'Failed to get deposits' });
  }
});

adminRouter.put('/deposits/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    const settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
    const commissionRate = (settings?.referralCommissionPercent || 30) / 100;

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id },
        data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Admin' },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
      if (wallet) {
        await tx.wallet.update({
          where: { userId: deposit.userId },
          data: { main: { increment: deposit.amount } },
        });
      }

      await tx.transaction.updateMany({
        where: { reference: deposit.reference },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });

      const existingDeposits = await tx.deposit.count({
        where: { userId: deposit.userId, status: 'SUCCESS' },
      });

      if (existingDeposits === 1) {
        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
        if (user?.referrerAgentId) {
          const agent = await tx.agentProfile.findUnique({ where: { id: user.referrerAgentId } });
          if (agent) {
            const commissionAmount = Math.round(deposit.amount * commissionRate);

            await tx.agentReferral.updateMany({
              where: { userId: deposit.userId, status: 'WAITING_DEPOSIT' },
              data: {
                firstDeposit: deposit.amount,
                commission: commissionAmount,
                status: 'COMMISSION_PAID',
              },
            });

            await tx.agentCommission.create({
              data: {
                agentId: agent.id,
                referredUserId: deposit.userId,
                referredName: user.fullName,
                depositAmount: deposit.amount,
                commissionRate,
                commissionAmount,
              },
            });

            const agentWallet = await tx.wallet.findUnique({ where: { userId: agent.userId } });
            if (agentWallet) {
              await tx.wallet.update({
                where: { userId: agent.userId },
                data: { main: { increment: commissionAmount } },
              });
            }

            await tx.agentProfile.update({
              where: { id: agent.id },
              data: {
                totalCommission: { increment: commissionAmount },
                qualifiedDeposits: { increment: 1 },
                availableBalance: { increment: commissionAmount },
              },
            });

            await tx.transaction.create({
              data: {
                userId: agent.userId,
                type: 'REFERRAL_COMMISSION',
                amount: commissionAmount,
                method: `Referral Commission - ${user.fullName}`,
                reference: 'REFCOM-' + deposit.reference.slice(-8),
                status: 'SUCCESS',
              },
            });
          }
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

adminRouter.put('/deposits/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    await prisma.deposit.update({
      where: { id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        rejectionReason: req.body.reason || 'Rejected by administrator',
      },
    });

    await prisma.transaction.updateMany({
      where: { reference: deposit.reference },
      data: { status: 'FAILED', completedAt: new Date() },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

adminRouter.get('/withdrawals', async (_req: AuthRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
    res.json(withdrawals);
  } catch {
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});

adminRouter.put('/withdrawals/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    // ISSUE 5: Gross amount already deducted at request time. Only update status.
    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Admin' },
      });
      await tx.transaction.updateMany({
        where: { reference: withdrawal.reference },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

adminRouter.put('/withdrawals/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    // ISSUE 5: Refund GROSS amount back to wallet on rejection
    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: { status: 'FAILED', completedAt: new Date(), rejectionReason: req.body.reason || 'Rejected' },
      });
      await tx.transaction.updateMany({
        where: { reference: withdrawal.reference },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: { main: { increment: withdrawal.amount } },
      });
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

adminRouter.get('/orders', async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.investmentOrder.findMany({
      orderBy: { purchaseDate: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

adminRouter.get('/transactions', async (_req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { fullName: true, email: true } } },
    });
    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

adminRouter.get('/verifications', async (_req: AuthRequest, res: Response) => {
  try {
    // Read verification data from the User table (verificationCode, verificationStatus, verifiedAt)
    const users = await prisma.user.findMany({
      orderBy: { verificationRequestedAt: 'desc' },
      where: { OR: [{ verificationCode: { not: null } }, { verificationStatus: { not: 'NONE' } }] },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        verificationCode: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationRequestedAt: true,
      },
    });
    res.json(users.map(u => ({
      id: u.id,
      userId: u.id,
      user: { fullName: u.fullName, email: u.email },
      fullName: u.fullName,
      email: u.email,
      mobileNumber: u.phone,
      verificationCode: u.verificationCode,
      status: u.verificationStatus || 'NONE',
      createdAt: u.verificationRequestedAt,
      verifiedAt: u.verifiedAt,
    })));
  } catch {
    res.status(500).json({ error: 'Failed to get verifications' });
  }
});

adminRouter.put('/verifications/:id/:action', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const action = req.params.action;
    if (action === 'approve') {
      await prisma.user.update({ where: { id }, data: { verificationStatus: 'APPROVED', verifiedAt: new Date() } });
    } else if (action === 'reject') {
      await prisma.user.update({ where: { id }, data: { verificationStatus: 'REJECTED' } });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// ============ ADMIN DEMO ACCOUNTS ============
// POST /api/admin/demo-users - Create a demo account (Super Admin only)
adminRouter.post('/demo-users', async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, phone, password, mainBalance, semBalance, ongoingBalance, verificationStatus, invitationCode, referrer } = req.body;
    if (!fullName || !email || !phone || !password) return res.status(400).json({ error: 'Full name, email, mobile number and password are required' });
    const e = String(email).toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email: e } })) return res.status(400).json({ error: 'Email is already registered.' });
    if (await prisma.user.findFirst({ where: { phone } })) return res.status(400).json({ error: 'Mobile number is already registered.' });

    let displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
    while (await prisma.user.findUnique({ where: { displayId } }).catch(() => null)) displayId = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
    let invCode = (invitationCode || Math.random().toString(36).substring(2, 10).toUpperCase());
    while (await prisma.user.findUnique({ where: { invitationCode: invCode } }).catch(() => null)) invCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let invitedBy: string | null = null;
    let referrerAgentId: string | null = null;
    let referrerDisplayId: string | null = null;
    if (referrer) {
      const ru = await prisma.user.findFirst({ where: { OR: [{ invitationCode: referrer }, { displayId: referrer }, { email: String(referrer).toLowerCase().trim() }] } });
      if (ru) {
        invitedBy = ru.invitationCode;
        referrerDisplayId = ru.displayId;
        const ag = await prisma.agentProfile.findUnique({ where: { userId: ru.id } }).catch(() => null);
        if (ag) referrerAgentId = ag.id;
      }
    }
    const parsedMain = parseFloat(mainBalance || 0) || 0;
    const parsedSem = parseFloat(semBalance || 0) || 0;
    const parsedOngoing = parseFloat(ongoingBalance || 0) || 0;
    const hashed = await bcrypt.hash(String(password), 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayId, email: e, password: hashed, fullName, phone,
          isDemo: true,
          invitationCode: invCode, invitationLink: `${baseUrl}/register?ref=${invCode}`,
          invitedBy, referrerAgentId,
          verificationStatus: verificationStatus || 'NONE',
          referralCount: 0, totalReferralEarnings: 0,
        },
      });
      await tx.wallet.create({ data: { userId: user.id, main: parsedMain, semWallet: parsedSem, ongoing: parsedOngoing } });
      if (invitedBy) {
        await tx.referral.create({ data: { inviterCode: invitedBy, referredUserId: user.id, referredName: fullName, referredEmail: e, status: 'active' } });
        const inviter = await tx.user.findFirst({ where: { invitationCode: invitedBy } });
        if (inviter) await tx.user.update({ where: { id: inviter.id }, data: { referralCount: { increment: 1 } } });
      }
      if (referrerAgentId) {
        await tx.agentReferral.create({ data: { agentId: referrerAgentId, userId: user.id, fullName, email: e, status: 'WAITING_DEPOSIT' } });
        await tx.agentProfile.update({ where: { id: referrerAgentId }, data: { totalReferrals: { increment: 1 } } });
      }
      await tx.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: user.id, action: 'Create Demo Account', timestamp: new Date() } });
      return user;
    });
    return res.status(201).json({ id: result.id, displayId, email: e, fullName, phone, isDemo: true, createdAt: result.createdAt });
  } catch (error: any) {
    console.error('Create demo user error:', error?.message || error);
    res.status(500).json({ error: 'Failed to create demo account' });
  }
});

// GET /api/admin/demo-users - List demo accounts
adminRouter.get('/demo-users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({ where: { isDemo: true }, orderBy: { createdAt: 'desc' }, include: { wallet: true } });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to get demo users' });
  }
});

// PATCH /api/admin/users/:id/convert-demo
adminRouter.patch('/users/:id/convert-demo', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const user = await prisma.user.update({ where: { id }, data: { isDemo: true } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Convert Demo', beforeValue: String(target.isDemo), afterValue: 'true', timestamp: new Date() } });
    res.json({ success: true, isDemo: true, user });
  } catch {
    res.status(500).json({ error: 'Failed to convert to demo' });
  }
});

// PATCH /api/admin/users/:id/convert-real
adminRouter.patch('/users/:id/convert-real', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const user = await prisma.user.update({ where: { id }, data: { isDemo: false } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Convert Real', beforeValue: String(target.isDemo), afterValue: 'false', timestamp: new Date() } });
    res.json({ success: true, isDemo: false, user });
  } catch {
    res.status(500).json({ error: 'Failed to convert to real' });
  }
});

adminRouter.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: 'default' } });
    }
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

adminRouter.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.platformSettings.update({
      where: { id: 'default' },
      data: req.body,
    });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});