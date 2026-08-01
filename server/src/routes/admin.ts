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
    const [users, deposits, withdrawals, orders, transactions, activeSessions, newUsersToday, verifiedUsers, pendingVerification, suspendedBanned, welcomeBonuses, referralCommissions, walletBalance, activeVIP, investedAmount, dailyProfit, completingToday, runningPlans, pendingDeposits, pendingWithdrawals, pendingKYC, failedTx, supportTickets] = await Promise.all([
      prisma.user.count(),
      prisma.deposit.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.withdrawal.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.count(),
      prisma.userSession.count({ where: { expiresAt: { gte: new Date() } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.user.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.user.count({ where: { verificationStatus: { in: ['SUSPENDED', 'BANNED'] } } }),
      prisma.welcomeBonusClaim.aggregate({ _sum: { amount: true } }),
      prisma.agentCommission.aggregate({ _sum: { commissionAmount: true } }),
      prisma.wallet.aggregate({ _sum: { main: true } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
      prisma.investmentOrder.aggregate({ _sum: { buyAmount: true }, where: { status: 'ACTIVE' } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'DAILY_PROFIT', createdAt: { gte: today } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', completedDays: { gte: 29 } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE' } }),
      prisma.deposit.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count({ where: { status: 'FAILED' } }),
      prisma.notification.count({ where: { read: false } }),
    ]);

    res.json({
      totalUsers: users,
      onlineUsers: activeSessions,
      newUsersToday,
      verifiedUsers,
      pendingVerification,
      suspendedBanned,
      totalDeposits: deposits._sum.amount || 0,
      totalWithdrawals: withdrawals._sum.amount || 0,
      netRevenue: (deposits._sum.amount || 0) - (withdrawals._sum.amount || 0),
      totalWelcomeBonuses: welcomeBonuses._sum.amount || 0,
      totalReferralCommissions: referralCommissions._sum.commissionAmount || 0,
      totalWalletBalance: walletBalance._sum.main || 0,
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

    await prisma.withdrawal.update({
      where: { id },
      data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Admin' },
    });

    await prisma.wallet.update({
      where: { userId: withdrawal.userId },
      data: { main: { decrement: withdrawal.amount } },
    });

    await prisma.transaction.updateMany({
      where: { reference: withdrawal.reference },
      data: { status: 'SUCCESS', completedAt: new Date() },
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

    await prisma.withdrawal.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), rejectionReason: req.body.reason || 'Rejected' },
    });

    await prisma.transaction.updateMany({
      where: { reference: withdrawal.reference },
      data: { status: 'FAILED', completedAt: new Date() },
    });

    await prisma.wallet.update({
      where: { userId: withdrawal.userId },
      data: { main: { increment: withdrawal.amount } },
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