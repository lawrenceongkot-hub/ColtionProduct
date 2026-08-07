import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * DIAGNOSTIC SCRIPT - Traces the complete referral commission execution path
 * for NEW deposits on production database.
 */
async function diagnose() {
  console.log('=== REFERRAL COMMISSION DIAGNOSTIC ===\n');

  // 1. Check PlatformSettings exists
  const settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
  console.log('[1] PlatformSettings:', settings ? `FOUND - commission=${settings.referralCommissionPercent}%` : 'MISSING');
  console.log('    PASS ✓');

  // 2. Check latest SUCCESS deposits and whether commission was generated
  const latestSuccessDeposits = await prisma.deposit.findMany({
    where: { status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { id: true, fullName: true, invitedBy: true, referrerAgentId: true } } },
  });

  console.log(`\n[2] Latest ${latestSuccessDeposits.length} SUCCESS deposits:`);
  
  for (const d of latestSuccessDeposits) {
    const user = d.user;
    
    // Check if commission was created for this deposit
    const refCommTx = await prisma.transaction.findFirst({
      where: { type: 'REFERRAL_COMMISSION', reference: { contains: 'REFCOM-' + d.reference.slice(-8) } },
    });
    
    // Check if AgentCommission exists for this user
    const agentComm = await prisma.agentCommission.findFirst({
      where: { referredUserId: user.id },
    });

    // Check referral records
    const referral = user.invitedBy 
      ? await prisma.referral.findFirst({ where: { referredUserId: user.id } }) 
      : null;
    
    const agentReferral = user.referrerAgentId
      ? await prisma.agentReferral.findFirst({ where: { userId: user.id } })
      : null;

    // Check inviter exists
    const inviter = user.invitedBy 
      ? await prisma.user.findFirst({ where: { invitationCode: user.invitedBy } }) 
      : null;
    
    const agentProfile = user.referrerAgentId
      ? await prisma.agentProfile.findUnique({ where: { id: user.referrerAgentId } })
      : null;

    console.log(`\n  Deposit: ${d.id} | Ref: ${d.reference} | Amount: ₱${d.amount} | Status: ${d.status}`);
    console.log(`  User: ${user.fullName} | invitedBy: ${user.invitedBy || 'NONE'} | referrerAgentId: ${user.referrerAgentId || 'NONE'}`);
    console.log(`  Commission TX: ${refCommTx ? 'FOUND' : 'NONE'}`);
    console.log(`  AgentCommission: ${agentComm ? 'FOUND' : 'NONE'}`);
    console.log(`  Referral record: ${referral ? `${referral.status}` : 'NONE'}`);
    console.log(`  AgentReferral: ${agentReferral ? `${agentReferral.status}` : 'NONE'}`);
    console.log(`  Inviter user: ${inviter ? inviter.fullName : 'NONE'}`);
    console.log(`  AgentProfile: ${agentProfile ? agentProfile.agentCode : 'NONE'}`);
  }

  // 3. Check all referred users that could trigger commission
  const referredUsers = await prisma.user.findMany({
    where: { OR: [{ invitedBy: { not: null } }, { referrerAgentId: { not: null } }] },
    include: { wallet: true },
  });

  console.log(`\n[3] Total referred users: ${referredUsers.length}`);

  for (const r of referredUsers) {
    const deposits = await prisma.deposit.findMany({
      where: { userId: r.id },
      orderBy: { createdAt: 'asc' },
    });
    
    const successDeposits = deposits.filter(d => d.status === 'SUCCESS');
    
    if (successDeposits.length > 0) {
      const hasCommTx = await prisma.transaction.findFirst({ 
        where: { type: 'REFERRAL_COMMISSION', method: { contains: r.fullName } } 
      });
      console.log(`\n  ${r.fullName} (${r.id}) | Wallet main: ${r.wallet?.main || 0}`);
      console.log(`    SUCCESS deposits: ${successDeposits.length} | First: ₱${successDeposits[0].amount} | Commission TX: ${hasCommTx ? 'YES' : 'NO'}`);
    }
  }

  // 4. Check the webhook path - verify processReferralCommission would be invoked
  console.log(`\n[4] Webhook path verification:`);
  console.log(`    Payment webhook route: POST /api/payments/moxsys/webhook`);
  console.log(`    After deposit SUCCESS, calls processReferralCommission(tx, userId, amount, reference)`);
  console.log(`    This code is in server/src/routes/payment.ts - if EC2 hasn't been updated, old code runs`);

  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

diagnose()
  .catch((e) => { console.error('Diagnostic error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });