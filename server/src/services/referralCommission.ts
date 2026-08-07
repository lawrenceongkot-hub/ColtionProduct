import { PrismaClient } from '@prisma/client';

/**
 * Shared referral commission logic - SINGLE SOURCE OF TRUTH.
 * Used by BOTH:
 *  - Admin approval flow (server/src/routes/admin.ts)
 *  - Moxsys payment webhook (server/src/routes/payment.ts)
 *
 * This function must ONLY be called after a deposit is marked SUCCESS.
 * It checks:
 *  - Referral relationship exists (invitedBy or agent profile)
 *  - This is the FIRST successful deposit of the referred user
 *  - Commission has NOT already been paid
 */

export async function processReferralCommission(
  tx: PrismaClient,
  depositUserId: string,
  depositAmount: number,
  depositReference: string
): Promise<void> {
  // Get platform commission rate
  const settings = await tx.platformSettings.findUnique({ where: { id: 'default' } });
  const commissionRate = (settings?.referralCommissionPercent || 30) / 100;

  // Count existing SUCCESS deposits for this user (excluding this one)
  const existingDepositCount = await tx.deposit.count({
    where: { userId: depositUserId, status: 'SUCCESS', reference: { not: depositReference } },
  });

  // ONLY first successful deposit qualifies
  if (existingDepositCount > 0) return;

  // Get user with referral info
  const user = await tx.user.findUnique({ where: { id: depositUserId } });
  if (!user) return;

  // ============ AGENT REFERRAL (AgentProfile-based) ============
  if (user.referrerAgentId) {
    const agent = await tx.agentProfile.findUnique({ where: { id: user.referrerAgentId } });
    if (agent) {
      // Check if commission already paid for this user via agent referral
      const paidRef = await tx.agentReferral.findFirst({
        where: { userId: depositUserId, status: 'COMMISSION_PAID' },
      });
      if (!paidRef) {
        const commissionAmount = Math.round(depositAmount * commissionRate);

        await tx.agentReferral.updateMany({
          where: { userId: depositUserId, status: 'WAITING_DEPOSIT' },
          data: {
            firstDeposit: depositAmount,
            commission: commissionAmount,
            status: 'COMMISSION_PAID',
          },
        });

        await tx.agentCommission.create({
          data: {
            agentId: agent.id,
            referredUserId: depositUserId,
            referredName: user.fullName,
            depositAmount,
            commissionRate,
            commissionAmount,
          },
        });

        await tx.wallet.update({
          where: { userId: agent.userId },
          data: { main: { increment: commissionAmount } },
        });

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
            reference: 'REFCOM-' + depositReference.slice(-8),
            status: 'SUCCESS',
          },
        });
      }
    }
  }

  // ============ REGULAR USER REFERRAL (invitedBy) ============
  if (user.invitedBy) {
    // Check if referral record exists and commission not already paid
    const referral = await tx.referral.findFirst({
      where: { referredUserId: depositUserId, status: { not: 'COMMISSION_PAID' } },
    });
    if (referral) {
      const inviter = await tx.user.findFirst({ where: { invitationCode: user.invitedBy } });
      if (inviter) {
        const commissionAmount = Math.round(depositAmount * commissionRate);

        await tx.wallet.update({
          where: { userId: inviter.id },
          data: { main: { increment: commissionAmount } },
        });

        await tx.user.update({
          where: { id: inviter.id },
          data: { totalReferralEarnings: { increment: commissionAmount } },
        });

        await tx.transaction.create({
          data: {
            userId: inviter.id,
            type: 'REFERRAL_COMMISSION',
            amount: commissionAmount,
            method: `Referral Commission - ${user.fullName}`,
            reference: 'REFCOM-' + depositReference.slice(-8),
            status: 'SUCCESS',
          },
        });

        await tx.notification.create({
          data: {
            userId: inviter.id,
            type: 'REFERRAL_COMMISSION',
            message: `You earned ₱${commissionAmount} referral commission from ${user.fullName}'s first deposit.`,
          },
        });

        await tx.referral.updateMany({
          where: { referredUserId: depositUserId },
          data: { status: 'COMMISSION_PAID' },
        });
      }
    }
  }
}