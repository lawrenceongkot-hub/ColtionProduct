import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ONE-TIME REPAIR SCRIPT
 * Repairs missing referral commissions for EXISTING production deposits.
 *
 * Finds every FIRST SUCCESSFUL deposit that:
 *  1. Deposit status = SUCCESS
 *  2. User was invited (Referral table or AgentReferral table)
 *  3. No REFERRAL_COMMISSION transaction exists
 *  4. No AgentCommission record exists
 *  5. No COMMISSION_PAID status exists
 *  6. Deposit is the FIRST successful deposit only
 *
 * Credits exactly once, matching the webhook logic exactly.
 * Idempotent - running twice will NOT create duplicates.
 */

async function repairReferralCommissions(): Promise<void> {
  console.log('=== REFERRAL COMMISSION REPAIR START ===');

  const settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
  const commissionRate = (settings?.referralCommissionPercent || 30) / 100;
  console.log(`Commission rate: ${commissionRate * 100}%`);

  // Get all users who have been referred (either via Referral or AgentReferral)
  const referredUsers = await prisma.user.findMany({
    where: {
      OR: [
        { invitedBy: { not: null } },
        { referrerAgentId: { not: null } },
      ],
    },
    select: { id: true, fullName: true, email: true, invitedBy: true, referrerAgentId: true },
  });

  console.log(`Found ${referredUsers.length} referred users to check`);

  let repaired = 0;
  let skipped = 0;

  for (const user of referredUsers) {
    // Find the FIRST successful deposit for this user
    const firstDeposit = await prisma.deposit.findFirst({
      where: { userId: user.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'asc' },
    });

    if (!firstDeposit) {
      skipped++;
      continue;
    }

    // Check if commission already paid via REFERRAL_COMMISSION transaction
    const existingCommissionTx = await prisma.transaction.findFirst({
      where: {
        type: 'REFERRAL_COMMISSION',
        method: { contains: user.fullName },
      },
    });

    // Check if AgentCommission already exists for this user
    const existingAgentCommission = await prisma.agentCommission.findFirst({
      where: { referredUserId: user.id },
    });

    // Check if AgentReferral already marked COMMISSION_PAID
    const existingAgentReferralPaid = await prisma.agentReferral.findFirst({
      where: { userId: user.id, status: 'COMMISSION_PAID' },
    });

    // Check if Referral already marked COMMISSION_PAID
    const existingReferralPaid = await prisma.referral.findFirst({
      where: { referredUserId: user.id, status: 'COMMISSION_PAID' },
    });

    // Skip if any commission record already exists
    if (existingCommissionTx || existingAgentCommission || existingAgentReferralPaid || existingReferralPaid) {
      skipped++;
      continue;
    }

    const commissionAmount = Math.round(firstDeposit.amount * commissionRate);
    if (commissionAmount <= 0) {
      skipped++;
      continue;
    }

    // Get wallet before for reporting
    let walletBefore = 0;

    try {
      await prisma.$transaction(async (tx) => {
        // ============ AGENT REFERRAL (AgentProfile-based) ============
        if (user.referrerAgentId) {
          const agent = await tx.agentProfile.findUnique({ where: { id: user.referrerAgentId! } });
          if (agent) {
            const agentWallet = await tx.wallet.findUnique({ where: { userId: agent.userId } });
            walletBefore = agentWallet?.main || 0;

            await tx.agentReferral.updateMany({
              where: { userId: user.id, status: 'WAITING_DEPOSIT' },
              data: {
                firstDeposit: firstDeposit.amount,
                commission: commissionAmount,
                status: 'COMMISSION_PAID',
              },
            });

            await tx.agentCommission.create({
              data: {
                agentId: agent.id,
                referredUserId: user.id,
                referredName: user.fullName,
                depositAmount: firstDeposit.amount,
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

            const txRecord = await tx.transaction.create({
              data: {
                userId: agent.userId,
                type: 'REFERRAL_COMMISSION',
                amount: commissionAmount,
                method: `Referral Commission - ${user.fullName}`,
                reference: 'REFCOM-REPAIR-' + firstDeposit.reference.slice(-8),
                status: 'SUCCESS',
              },
            });

            await tx.notification.create({
              data: {
                userId: agent.userId,
                type: 'REFERRAL_COMMISSION',
                message: `You earned ₱${commissionAmount} referral commission from ${user.fullName}'s first deposit.`,
              },
            });

            const agentAfter = await tx.wallet.findUnique({ where: { userId: agent.userId } });
            console.log(`✅ AGENT: ${agent.userId} | User: ${user.fullName} | Deposit: ₱${firstDeposit.amount} | Commission: ₱${commissionAmount} | Wallet: ₱${walletBefore} → ₱${agentAfter?.main || 0} | TX: ${txRecord.id}`);
            repaired++;
          }
        }

        // ============ REGULAR USER REFERRAL (invitedBy) ============
        if (user.invitedBy) {
          const inviter = await tx.user.findFirst({ where: { invitationCode: user.invitedBy } });
          if (inviter) {
            const inviterWallet = await tx.wallet.findUnique({ where: { userId: inviter.id } });
            walletBefore = inviterWallet?.main || 0;

            await tx.wallet.update({
              where: { userId: inviter.id },
              data: { main: { increment: commissionAmount } },
            });

            await tx.user.update({
              where: { id: inviter.id },
              data: { totalReferralEarnings: { increment: commissionAmount } },
            });

            const txRecord = await tx.transaction.create({
              data: {
                userId: inviter.id,
                type: 'REFERRAL_COMMISSION',
                amount: commissionAmount,
                method: `Referral Commission - ${user.fullName}`,
                reference: 'REFCOM-REPAIR-' + firstDeposit.reference.slice(-8),
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
              where: { referredUserId: user.id },
              data: { status: 'COMMISSION_PAID' },
            });

            const inviterAfter = await tx.wallet.findUnique({ where: { userId: inviter.id } });
            console.log(`✅ REFERRER: ${inviter.id} | User: ${user.fullName} | Deposit: ₱${firstDeposit.amount} | Commission: ₱${commissionAmount} | Wallet: ₱${walletBefore} → ₱${inviterAfter?.main || 0} | TX: ${txRecord.id}`);
            repaired++;
          }
        }
      });
    } catch (e: any) {
      console.error(`❌ FAILED for user ${user.fullName} (${user.id}): ${e?.message || e}`);
    }
  }

  console.log(`=== REPAIR COMPLETE ===`);
  console.log(`Repaired: ${repaired}`);
  console.log(`Skipped (already paid or no deposit): ${skipped}`);
}

repairReferralCommissions()
  .catch((e) => {
    console.error('Repair script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });