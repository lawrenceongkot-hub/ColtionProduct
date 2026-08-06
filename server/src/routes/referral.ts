import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const referralRouter = Router();

referralRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Find all referrals where the current user is the inviter
    const referrals = await prisma.referral.findMany({
      where: { inviterCode: user.invitationCode },
      orderBy: { joinedDate: 'desc' },
      take: 50,
    });

    // Collect referred user IDs for batch queries
    const referredUserIds = referrals.map(r => r.referredUserId);

    // Batch fetch referred users with verification info
    const referredUsers: any[] = [];
    if (referredUserIds.length > 0) {
      Object.assign(referredUsers, await prisma.user.findMany({
        where: { id: { in: referredUserIds } },
        select: {
          id: true, displayId: true, fullName: true, email: true,
          verificationStatus: true,
        },
      }));
    }
    const userMap = new Map(referredUsers.map(u => [u.id, u]));

    // Batch fetch SUCCESS deposits for all referred users
    const deposits: any[] = [];
    if (referredUserIds.length > 0) {
      Object.assign(deposits, await prisma.deposit.findMany({
        where: {
          userId: { in: referredUserIds },
          status: 'SUCCESS',
        },
        select: { userId: true, amount: true },
      }));
    }

    // Batch fetch SUCCESS withdrawals for all referred users
    const withdrawals: any[] = [];
    if (referredUserIds.length > 0) {
      Object.assign(withdrawals, await prisma.withdrawal.findMany({
        where: {
          userId: { in: referredUserIds },
          status: 'SUCCESS',
        },
        select: { userId: true, amount: true },
      }));
    }

    // Fetch all REFERRAL_COMMISSION transactions for the current user.
    // This is the AUTHORITATIVE source of commissions (both regular referral and agent).
    const commissionTxs = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'REFERRAL_COMMISSION',
        status: 'SUCCESS',
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate deposits per user
    const depositAgg = new Map<string, { count: number; total: number }>();
    for (const d of deposits) {
      const existing = depositAgg.get(d.userId) || { count: 0, total: 0 };
      depositAgg.set(d.userId, { count: existing.count + 1, total: existing.total + d.amount });
    }

    // Aggregate withdrawals per user
    const withdrawalAgg = new Map<string, number>();
    for (const w of withdrawals) {
      withdrawalAgg.set(w.userId, (withdrawalAgg.get(w.userId) || 0) + w.amount);
    }

    // Build enriched recentReferrals
    const recentReferrals = referrals.map(r => {
      const refUser = userMap.get(r.referredUserId);
      const depInfo = depositAgg.get(r.referredUserId) || { count: 0, total: 0 };
      const isPaid = r.status === 'COMMISSION_PAID';
      return {
        id: r.referredUserId,
        referredUserId: r.referredUserId,
        fullName: r.referredName,
        email: r.referredEmail,
        displayId: refUser?.displayId || '',
        joinedDate: r.joinedDate,
        status: r.status,
        verificationStatus: refUser?.verificationStatus || 'NONE',
        isVerified: refUser?.verificationStatus === 'APPROVED',
        isActive: !isPaid && depInfo.count === 0,
        hasDeposit: depInfo.count > 0,
        totalDeposit: depInfo.total,
        totalWithdrawal: withdrawalAgg.get(r.referredUserId) || 0,
      };
    });

    // ============ STATISTICS ============
    const totalReferrals = referrals.length;

    // Total commission earned: derive from REFERRAL_COMMISSION transactions.
    // Fall back to user.totalReferralEarnings if no transactions exist yet.
    const totalCommissionEarned = commissionTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const effectiveTotalEarnings = totalCommissionEarned > 0
      ? totalCommissionEarned
      : (user.totalReferralEarnings || 0);

    // Verified referrals: referred users with APPROVED verification
    const verifiedReferrals = referredUsers.filter(u => u.verificationStatus === 'APPROVED').length;

    // Active referrals: referral records with status 'active'
    const activeReferrals = referrals.filter(r => r.status === 'active').length;

    // Deposited referrals: referred users with at least one successful deposit
    const depositedReferrals = depositAgg.size;

    // Total deposit amount from all referred users
    const totalDepositAmount = deposits.reduce((sum: number, d: any) => sum + d.amount, 0);

    // Pending commission: referrals who have deposited but whose status is still 'active'
    // (i.e., commission not yet credited for their first approved deposit)
    const settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
    const commissionRate = (settings?.referralCommissionPercent || 30) / 100;

    let pendingCommission = 0;
    for (const r of referrals) {
      if (r.status === 'active') {
        const depInfo = depositAgg.get(r.referredUserId);
        if (depInfo && depInfo.total > 0) {
          pendingCommission += Math.round(depInfo.total * commissionRate);
        }
      }
    }

    // Paid commission = total commission earned
    const paidCommission = effectiveTotalEarnings;

    res.json({
      referralCount: totalReferrals,
      totalEarnings: effectiveTotalEarnings,
      stats: {
        totalReferrals,
        totalCommissionEarned: effectiveTotalEarnings,
        totalEarnings: effectiveTotalEarnings,
        verifiedReferrals,
        activeReferrals,
        depositedReferrals,
        totalDepositAmount,
        pendingCommission,
        paidCommission,
      },
      recentReferrals,
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});