import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import { processReferralCommission } from '../services/referralCommission';
import { createMoxsysPayout } from '../services/payoutService';

export const adminRouter = Router();

// Admin Login
adminRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    // Lowercase username for case-insensitive lookup (seed stores 'admin')
    const admin = await prisma.adminUser.findUnique({ where: { username: String(username).toLowerCase().trim() } });
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

    res.json({
      accessToken: token,
      refreshToken: token,
      user: { id: admin.id, username: admin.username, email: admin.username, fullName: admin.name, role: admin.role },
    });
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
    // Online users = users with lastActivity within the last 5 minutes (REAL data only)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // CRITICAL: All production analytics EXCLUDE demo accounts (users.isDemo = true)
    const [users, deposits, withdrawals, orders, transactions, onlineUsers, newUsersToday, verifiedUsers, pendingVerification, suspendedBanned, welcomeBonuses, referralCommissions, walletBalance, activeVIP, investedAmount, dailyProfit, completingToday, runningPlans, pendingDeposits, pendingWithdrawals, pendingKYC, failedTx, supportTickets] = await Promise.all([
      prisma.user.count({ where: { isDemo: false } }),
      prisma.deposit.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', user: { isDemo: false } } }),
      prisma.withdrawal.aggregate({ _sum: { netAmount: true }, where: { status: 'SUCCESS', user: { isDemo: false } } }),
      prisma.investmentOrder.count({ where: { status: 'ACTIVE', user: { isDemo: false } } }),
      prisma.transaction.count({ where: { user: { isDemo: false } } }),
      prisma.user.count({ where: { isDemo: false, lastActivity: { gte: fiveMinutesAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: today }, isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: 'APPROVED', isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: 'PENDING', isDemo: false } }),
      prisma.user.count({ where: { verificationStatus: { in: ['SUSPENDED', 'BANNED'] }, isDemo: false } }),
      prisma.welcomeBonusClaim.aggregate({ _sum: { amount: true }, where: { user: { isDemo: false } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS', user: { isDemo: false } } }),
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

    // Server-side validation: onlineUsers must NEVER exceed totalUsers
    if (onlineUsers > users) {
      console.error(`[DASHBOARD ERROR] onlineUsers (${onlineUsers}) exceeds totalUsers (${users}) - calculation is incorrect!`);
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`onlineUsers (${onlineUsers}) exceeds totalUsers (${users})`);
      }
    }

    const totalWalletBalance = (walletBalance._sum.main || 0) + (walletBalance._sum.semWallet || 0) + (walletBalance._sum.ongoing || 0);
    const totalDeposits = deposits._sum.amount || 0;
    const totalWithdrawals = withdrawals._sum.netAmount || 0;

    res.json({
      totalUsers: users,
      onlineUsers: Math.min(onlineUsers, users),
      newUsersToday,
      verifiedUsers,
      pendingVerification,
      suspendedBanned,
      totalDeposits,
      totalWithdrawals,
      netRevenue: totalDeposits - totalWithdrawals,
      totalWelcomeBonuses: welcomeBonuses._sum.amount || 0,
      totalReferralCommissions: referralCommissions._sum.amount || 0,
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
        invitedBy: true, isDemo: true, status: true, verificationStatus: true,
        lastActivity: true,
        wallet: { select: { main: true, semWallet: true, ongoing: true } },
      },
    });

    // Fetch registration fingerprints for device + IP info
    const userIds = users.map(u => u.id);
    const fingerprints = userIds.length > 0
      ? await prisma.registrationFingerprint.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, ipAddress: true, deviceFingerprint: true },
        })
      : [];
    const fingerprintMap = new Map(fingerprints.map(f => [f.userId, f]));

    // Resolve referrer display IDs and names for all users who have an invitedBy code
    const invitedByCodes = users.map(u => u.invitedBy).filter(Boolean) as string[];
    const referrers = invitedByCodes.length > 0
      ? await prisma.user.findMany({
          where: { invitationCode: { in: invitedByCodes } },
          select: { invitationCode: true, displayId: true, fullName: true },
        })
      : [];
    const referrerMap = new Map(referrers.map(r => [r.invitationCode, r]));

    // Enrich users with all profile data from production database
    const enriched = users.map(u => {
      const referrer = u.invitedBy ? referrerMap.get(u.invitedBy) : null;
      const fp = fingerprintMap.get(u.id);
      return {
        ...u,
        // Last login from lastActivity (updated by auth middleware on every request)
        lastLogin: u.lastActivity || null,
        // Last login IP from registration fingerprint (production data)
        lastLoginIp: fp?.ipAddress || '',
        // Device from registration fingerprint (production data)
        device: fp?.deviceFingerprint || '',
        // Referral code is the user's own invitation code
        referralCode: u.invitationCode || '',
        // Referred by - actual inviter from database relationship
        referredBy: u.invitedBy || '',
        referrerDisplayId: referrer?.displayId || '',
        referrerFullName: referrer?.fullName || '',
        referrerInvitationCode: referrer?.invitationCode || '',
      };
    });

    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Wipe all users - MUST be defined BEFORE /users/:id to avoid route conflict
// (Express matches /users/:id first, treating "wipe-all" as a user ID)
adminRouter.delete('/users/wipe-all', async (req: AuthRequest, res: Response) => {
  try {
    const before = { users: await prisma.user.count(), transactions: await prisma.transaction.count(), deposits: await prisma.deposit.count(), withdrawals: await prisma.withdrawal.count(), wallets: await prisma.wallet.count() };
    await prisma.$transaction(async (tx) => {
      await tx.changePasswordToken.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.walletLedger.deleteMany({});
      await tx.auditLog.deleteMany({});
      await tx.welcomeBonusClaim.deleteMany({});
      await tx.registrationFingerprint.deleteMany({});
      await tx.verificationRequest.deleteMany({});
      await tx.agentCommission.deleteMany({});
      await tx.agentReferral.deleteMany({});
      await tx.agentProfile.deleteMany({});
      await tx.referral.deleteMany({});
      await tx.eWallet.deleteMany({});
      await tx.investmentOrder.deleteMany({});
      await tx.transaction.deleteMany({});
      await tx.withdrawal.deleteMany({});
      await tx.deposit.deleteMany({});
      await tx.userSession.deleteMany({});
      await tx.wallet.deleteMany({});
      await tx.user.deleteMany({});
    }, {
      timeout: 30000,
      maxWait: 30000,
    });
    const after = { users: await prisma.user.count(), transactions: await prisma.transaction.count(), deposits: await prisma.deposit.count(), withdrawals: await prisma.withdrawal.count(), wallets: await prisma.wallet.count() };
    res.json({ success: true, message: 'All registered accounts and data wiped. Statistics reset.', before, after });
  } catch (e: any) {
    console.error('Wipe all users error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to wipe users' });
  }
});

adminRouter.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Delete the user and all related production records in one transaction
    await prisma.$transaction(async (tx) => {
      // Child tables first (respect foreign key order)
      await tx.changePasswordToken.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.walletLedger.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { userId: id } });
      await tx.welcomeBonusClaim.deleteMany({ where: { userId: id } });
      await tx.registrationFingerprint.deleteMany({ where: { userId: id } });
      await tx.verificationRequest.deleteMany({ where: { userId: id } });
      await tx.agentCommission.deleteMany({ where: { referredUserId: id } });
      await tx.agentReferral.deleteMany({ where: { userId: id } });
      await tx.referral.deleteMany({ where: { referredUserId: id } });
      await tx.eWallet.deleteMany({ where: { userId: id } });
      await tx.investmentOrder.deleteMany({ where: { userId: id } });
      await tx.transaction.deleteMany({ where: { userId: id } });
      await tx.withdrawal.deleteMany({ where: { userId: id } });
      await tx.deposit.deleteMany({ where: { userId: id } });
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.wallet.deleteMany({ where: { userId: id } });

      // Delete agent profile if one exists
      const agentProfile = await tx.agentProfile.findUnique({ where: { userId: id } });
      if (agentProfile) {
        await tx.agentCommission.deleteMany({ where: { agentId: agentProfile.id } });
        await tx.agentReferral.deleteMany({ where: { agentId: agentProfile.id } });
        await tx.agentProfile.delete({ where: { id: agentProfile.id } });
      }

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    }, {
      timeout: 30000,
      maxWait: 30000,
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('Delete user error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to delete user' });
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

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id },
        data: { status: 'SUCCESS', completedAt: new Date(), approvedBy: 'Admin' },
      });

      // BUSINESS LOGIC: Deposits MUST credit SemWallet (NOT Main Wallet)
      await tx.wallet.update({
        where: { userId: deposit.userId },
        data: { semWallet: { increment: deposit.amount } },
      });

      await tx.transaction.updateMany({
        where: { reference: deposit.reference },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });

      // Use shared referral commission logic - SAME as Moxsys webhook (single source of truth)
      await processReferralCommission(tx as any, deposit.userId, deposit.amount, deposit.reference);
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
      include: {
        user: {
          select: {
            id: true,
            displayId: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            ewallets: { select: { id: true, provider: true, walletNumber: true } },
          },
        },
      },
    });

    // Enrich with flat fields the Admin UI expects + the bound payment account
    // (matched by walletNumber on the withdrawal against the user's e-wallets)
    const enriched = withdrawals.map(w => {
      const boundWallet = w.user?.ewallets?.find(e => e.walletNumber === w.walletNumber) || null;
      return {
        ...w,
        userFullName: w.user?.fullName || '',
        userEmail: w.user?.email || '',
        userPhone: w.user?.phone || '',
        userStatus: w.user?.status || '',
        userDisplayId: w.user?.displayId || '',
        accountName: w.user?.fullName || '',
        accountNumber: w.walletNumber || '',
        accountProvider: boundWallet?.provider || w.method || '',
        accountId: boundWallet?.id || '',
      };
    });

    res.json(enriched);
  } catch (e: any) {
    console.error('Get withdrawals error:', e?.message || e);
    res.status(500).json({ error: 'Failed to get withdrawals' });
  }
});

adminRouter.put('/withdrawals/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    console.log(`[Withdrawal Approval] START id=${id}`);
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, email: true, phone: true, isDemo: true, ewallets: { select: { provider: true, walletNumber: true } } } } },
    });
    if (!withdrawal) {
      console.log(`[Withdrawal Approval] Withdrawal not found id=${id}`);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    console.log(`[Withdrawal Approval] loaded id=${id} reference=${withdrawal.reference} status=${withdrawal.status} providerReference=${withdrawal.providerReference} amount=${withdrawal.amount} netAmount=${withdrawal.netAmount} method=${withdrawal.method}`);
    if (withdrawal.status !== 'PENDING') {
      console.log(`[Withdrawal Approval] Blocked: status ${withdrawal.status} != PENDING id=${id}`);
      return res.status(400).json({ error: 'Already processed' });
    }

    // DUPLICATE PAYOUT PROTECTION: If a provider reference already exists, do NOT send again.
    if (withdrawal.providerReference) {
      console.log(`[Withdrawal Approval] Blocked: providerReference already set id=${id}`);
      return res.status(400).json({ error: 'Payout already requested for this withdrawal' });
    }

    // Verify required user/payment-account information exists.
    const boundWallet = withdrawal.user?.ewallets?.find(e => e.walletNumber === withdrawal.walletNumber);
    if (!withdrawal.user?.fullName || !withdrawal.walletNumber) {
      console.log(`[Withdrawal Approval] Blocked: missing user/payment info id=${id}`);
      return res.status(400).json({ error: 'Required user/payment-account information is missing' });
    }

    // ============================================================
    // DEMO ACCOUNT PAYOUT SAFETY GUARD
    // Demo accounts must NEVER trigger a real Moxsys payout.
    // The backend determines demo status from the authoritative
    // database field User.isDemo. This cannot be bypassed by the frontend.
    // ============================================================
    if (withdrawal.user?.isDemo) {
      console.log(`[DEMO PAYOUT BLOCKED] withdrawal=${withdrawal.id} reference=${withdrawal.reference} amount=${withdrawal.amount} netAmount=${withdrawal.netAmount} method=${withdrawal.method}`);
      console.log(`[DEMO PAYOUT BLOCKED] Demo account detected. Moxsys payout NOT called. Simulating demo completion.`);
      // Simulate the payout internally for demonstration purposes.
      // NO real Moxsys request. NO real money transfer.
      await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            approvedBy: 'Admin (DEMO)',
            providerStatus: 'DEMO_SIMULATED',
            providerMessage: 'Demo account - payout simulated, no real money sent',
            payoutRequestedAt: new Date(),
          },
        });
        await tx.transaction.updateMany({
          where: { reference: withdrawal.reference },
          data: { status: 'SUCCESS', completedAt: new Date() },
        });
      });
      return res.json({ success: true, demo: true, message: 'Demo withdrawal completed (simulated, no real payout sent)' });
    }

    // Send exactly ONE payout request to the provider with the NET amount.
    console.log(`[Withdrawal Approval] Calling createMoxsysPayout id=${id} reference=${withdrawal.reference} netAmount=${withdrawal.netAmount} method=${withdrawal.method}`);
    const payout = await createMoxsysPayout(
      withdrawal.id,
      withdrawal.reference,
      withdrawal.netAmount, // NET amount (₱306), NOT the requested ₱340
      withdrawal.method,
      withdrawal.walletNumber,
      withdrawal.user?.fullName || ''
    );
    console.log(`[Withdrawal Approval] Payout response received id=${id} ok=${payout.ok} providerReference=${payout.providerReference} providerStatus=${payout.providerStatus} providerMessage=${payout.providerMessage}`);

    // Store the provider response regardless of outcome.
    await prisma.withdrawal.update({
      where: { id },
      data: {
        providerReference: payout.providerReference || null,
        providerStatus: payout.providerStatus || null,
        providerMessage: payout.providerMessage || null,
        moxsysIdempotencyKey: payout.idempotencyKey || null,
        payoutRequestedAt: new Date(),
      },
    });

    // Only mark SUCCESS if the provider confirmed the payout.
    if (payout.ok) {
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
      return res.json({ success: true, providerReference: payout.providerReference, providerStatus: payout.providerStatus });
    }

    // Provider rejected/failed. Keep the withdrawal PENDING (not falsely marked SUCCESS).
    console.error(`Withdrawal payout failed: reference=${withdrawal.reference} providerStatus=${payout.providerStatus} providerMessage=${payout.providerMessage}`);
    return res.status(502).json({
      error: 'Payout request failed. Withdrawal remains pending.',
      providerStatus: payout.providerStatus,
      providerMessage: payout.providerMessage,
    });
  } catch (e: any) {
    console.error('Approve withdrawal error:', e?.message || e);
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
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });

    // Enrich orders with computed fields the frontend expects.
    // Use remainingDays from the database (single source of truth).
    const enriched = orders.map(o => {
      const duration = o.duration || 0;
      const completedDays = o.completedDays || 0;
      const progressPercent = duration > 0 ? Math.min(100, Math.round((completedDays / duration) * 100)) : (o.status === 'COMPLETED' ? 100 : 0);
      const daysRemaining = o.remainingDays ?? Math.max(0, duration - completedDays);
      return {
        ...o,
        progressPercent,
        daysRemaining,
        userFullName: o.user?.fullName || '',
        userEmail: o.user?.email || '',
        userPhone: o.user?.phone || '',
      };
    });

    res.json(enriched);
  } catch (e: any) {
    console.error('Get orders error:', e?.message || e);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get profit history for a specific order (REAL DAILY_PROFIT transactions only)
// DAILY_PROFIT transactions are created with reference pattern: PROFIT-{orderId.slice(-8)}-{timestamp}
adminRouter.get('/orders/:id/profit-history', async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id as string;
    const order = await prisma.investmentOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Match DAILY_PROFIT transactions for this specific order via reference pattern
    const profitPrefix = 'PROFIT-' + orderId.slice(-8) + '-';
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: order.userId,
        type: 'DAILY_PROFIT',
        status: 'SUCCESS',
        reference: { startsWith: profitPrefix },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to the exact fields the frontend Profit History table expects
    // investmentDay = actual day number of the investment (days since purchaseDate)
    const purchaseTime = new Date(order.purchaseDate).getTime();
    const profitHistory = transactions.map(t => {
      const txTime = new Date(t.createdAt).getTime();
      const dayNumber = Math.max(1, Math.floor((txTime - purchaseTime) / (1000 * 60 * 60 * 24)) + 1);
      return {
        id: t.id,
        date: t.createdAt,
        amount: t.amount,
        walletCredited: 'Ongoing Wallet',
        status: t.status,
        investmentDay: dayNumber,
        createdAt: t.createdAt,
      };
    });

    res.json(profitHistory);
  } catch (e: any) {
    console.error('Get profit history error:', e?.message || e);
    res.status(500).json({ error: 'Failed to get profit history' });
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
    const data = { ...req.body };
    // Serialize complex fields to JSON strings BEFORE saving to Prisma
    if (data.paymentMethods && typeof data.paymentMethods === 'object') {
      data.paymentMethods = JSON.stringify(data.paymentMethods);
    }
    if (data.ipWhitelist && Array.isArray(data.ipWhitelist)) {
      data.ipWhitelist = JSON.stringify(data.ipWhitelist);
    }
    if (data.ipBlacklist && Array.isArray(data.ipBlacklist)) {
      data.ipBlacklist = JSON.stringify(data.ipBlacklist);
    }
    if (data.countryRestrictions && typeof data.countryRestrictions === 'object') {
      data.countryRestrictions = JSON.stringify(data.countryRestrictions);
    }
    const settings = await prisma.platformSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    res.json(settings);
  } catch (e: any) {
    console.error('Update settings error:', e?.message || e);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============ ADMIN USER MANAGEMENT ============

// Get audit log for a user
adminRouter.get('/users/:id/audit', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const logs = await prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// Get wallet balances for a user
adminRouter.get('/users/:id/wallet', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const w = await prisma.wallet.findUnique({ where: { userId: id } });
    res.json(w || { main: 0, semWallet: 0, ongoing: 0 });
  } catch {
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// Add Main Wallet balance
adminRouter.put('/users/:id/wallet/main/add', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const parsedAmount = parseFloat(amount);
    const ref = 'ADJ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const result = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({ where: { userId: id }, data: { main: { increment: parsedAmount } } });
      await tx.transaction.create({ data: { userId: id, type: 'ADMIN_ADJUSTMENT', amount: parsedAmount, method: 'Admin', reference: ref, status: 'SUCCESS', approvedBy: req.user?.email, completedAt: new Date() } });
      await tx.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Add Main Wallet', amount: parsedAmount, timestamp: new Date() } });
      return w;
    });
    res.json(result);
  } catch (e: any) {
    console.error('Add main wallet error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

// Deduct Main Wallet balance
adminRouter.put('/users/:id/wallet/main/deduct', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const parsedAmount = parseFloat(amount);
    const w = await prisma.wallet.findUnique({ where: { userId: id } });
    if (!w || w.main < parsedAmount) return res.status(400).json({ error: 'Insufficient balance' });
    const ref = 'ADJ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({ where: { userId: id }, data: { main: { decrement: parsedAmount } } });
      await tx.transaction.create({ data: { userId: id, type: 'ADMIN_DEDUCTION', amount: parsedAmount, method: 'Admin', reference: ref, status: 'SUCCESS', approvedBy: req.user?.email, completedAt: new Date() } });
      await tx.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Deduct Main Wallet', amount: parsedAmount, timestamp: new Date() } });
      return updated;
    });
    res.json(result);
  } catch (e: any) {
    console.error('Deduct main wallet error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

// Add SemWallet balance
adminRouter.put('/users/:id/wallet/sem/add', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const parsedAmount = parseFloat(amount);
    const ref = 'ADJ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const result = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({ where: { userId: id }, data: { semWallet: { increment: parsedAmount } } });
      await tx.transaction.create({ data: { userId: id, type: 'ADMIN_ADJUSTMENT', amount: parsedAmount, method: 'Admin', reference: ref, status: 'SUCCESS', approvedBy: req.user?.email, completedAt: new Date() } });
      await tx.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Add SemWallet', amount: parsedAmount, timestamp: new Date() } });
      return w;
    });
    res.json(result);
  } catch (e: any) {
    console.error('Add sem wallet error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

// Deduct SemWallet balance
adminRouter.put('/users/:id/wallet/sem/deduct', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const parsedAmount = parseFloat(amount);
    const w = await prisma.wallet.findUnique({ where: { userId: id } });
    if (!w || w.semWallet < parsedAmount) return res.status(400).json({ error: 'Insufficient balance' });
    const ref = 'ADJ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({ where: { userId: id }, data: { semWallet: { decrement: parsedAmount } } });
      await tx.transaction.create({ data: { userId: id, type: 'ADMIN_DEDUCTION', amount: parsedAmount, method: 'Admin', reference: ref, status: 'SUCCESS', approvedBy: req.user?.email, completedAt: new Date() } });
      await tx.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Deduct SemWallet', amount: parsedAmount, timestamp: new Date() } });
      return updated;
    });
    res.json(result);
  } catch (e: any) {
    console.error('Deduct sem wallet error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
  }
});

// Ban user
adminRouter.put('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({ where: { id }, data: { status: 'banned' } });
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Account Banned', timestamp: new Date() } });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Unban user
adminRouter.put('/users/:id/unban', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({ where: { id }, data: { status: 'active' } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Account Unbanned', timestamp: new Date() } });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Suspend user
adminRouter.put('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({ where: { id }, data: { status: 'suspended' } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Account Suspended', timestamp: new Date() } });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Activate user
adminRouter.put('/users/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.update({ where: { id }, data: { status: 'active' } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Account Activated', timestamp: new Date() } });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Force logout user
adminRouter.put('/users/:id/force-logout', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Force Logout', timestamp: new Date() } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Change user password
adminRouter.put('/users/:id/password', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(newPassword, 12) } });
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await prisma.auditLog.create({ data: { adminId: req.user?.id, adminName: req.user?.email, adminRole: 'admin', userId: id, action: 'Password Changed', timestamp: new Date() } });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// ============ ADMIN ORDER MANAGEMENT ============

// Pause order
adminRouter.put('/orders/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.investmentOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to pause order' });
  }
});

// Resume order
adminRouter.put('/orders/:id/resume', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.investmentOrder.update({ where: { id }, data: { status: 'ACTIVE' } });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to resume order' });
  }
});

// Cancel order
adminRouter.put('/orders/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const order = await prisma.investmentOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Complete order
adminRouter.put('/orders/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.investmentOrder.update({ where: { id }, data: { status: 'COMPLETED' } });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// Manual credit profit (same logic as scheduler - one day profit)
adminRouter.put('/orders/:id/credit-profit', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.investmentOrder.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'ACTIVE') return res.status(400).json({ error: 'Order is not active' });
    const profitAmount = order.dailyProfitPerDay;
    const newCompletedDays = order.completedDays + 1;
    const newRemainingDays = Math.max(0, order.duration - newCompletedDays);
    const newCurrentProfit = order.currentProfit + profitAmount;
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId: order.userId }, data: { ongoing: { increment: profitAmount } } });
      await tx.investmentOrder.update({ where: { id }, data: { completedDays: newCompletedDays, remainingDays: newRemainingDays, currentProfit: newCurrentProfit, lastProfitDate: new Date() } });
      await tx.transaction.create({ data: { userId: order.userId, type: 'DAILY_PROFIT', amount: profitAmount, method: 'system', reference: 'PROFIT-' + order.id.slice(-8) + '-' + Date.now(), status: 'SUCCESS' } });
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to credit profit' });
  }
});
