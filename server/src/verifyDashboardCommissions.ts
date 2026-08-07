import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * VERIFICATION SCRIPT - Dashboard Referral Commissions
 * Prints production database totals and compares with dashboard API.
 */
async function verify() {
  console.log('=== DASHBOARD REFERRAL COMMISSIONS VERIFICATION ===\n');

  // A. Total REFERRAL_COMMISSION records
  const refCommCount = await prisma.transaction.count({
    where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS' },
  });
  console.log(`A. Total REFERRAL_COMMISSION records: ${refCommCount}`);

  // B. SUM(amount) of all REFERRAL_COMMISSION transactions
  const refCommSum = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS' },
  });
  console.log(`B. SUM(amount) of REFERRAL_COMMISSION: ₱${refCommSum._sum.amount || 0}`);

  // B2. Same but excluding demo users
  const refCommSumReal = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS', user: { isDemo: false } },
  });
  console.log(`B2. SUM(amount) excluding demo users: ₱${refCommSumReal._sum.amount || 0}`);

  // C. Total AgentCommission records
  const agentCommCount = await prisma.agentCommission.count();
  console.log(`C. Total AgentCommission records: ${agentCommCount}`);

  // D. SUM(commissionAmount) from AgentCommission
  const agentCommSum = await prisma.agentCommission.aggregate({
    _sum: { commissionAmount: true },
  });
  console.log(`D. SUM(commissionAmount) from AgentCommission: ₱${agentCommSum._sum.commissionAmount || 0}`);

  // E. List all REFERRAL_COMMISSION transactions
  console.log('\n--- All REFERRAL_COMMISSION transactions ---');
  const allRefComms = await prisma.transaction.findMany({
    where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { fullName: true, isDemo: true } } },
  });
  for (const t of allRefComms) {
    console.log(`  ${t.id} | ${t.user?.fullName || 'N/A'} | ₱${t.amount} | ${t.reference} | demo:${t.user?.isDemo}`);
  }

  // F. List all AgentCommission records
  console.log('\n--- All AgentCommission records ---');
  const allAgentComms = await prisma.agentCommission.findMany({
    orderBy: { createdAt: 'asc' },
    include: { agent: { select: { userId: true } } },
  });
  for (const c of allAgentComms) {
    console.log(`  ${c.id} | agent:${c.agentId} | user:${c.referredUserId} | ₱${c.commissionAmount} | deposit:₱${c.depositAmount}`);
  }

  // G. Check what the dashboard query would return
  console.log('\n--- Dashboard query simulation ---');
  const dashboardQuery = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type: 'REFERRAL_COMMISSION', status: 'SUCCESS', user: { isDemo: false } },
  });
  console.log(`Dashboard query result: ₱${dashboardQuery._sum.amount || 0}`);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify()
  .catch((e) => { console.error('Verification error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });