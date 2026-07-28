import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Super Admin',
      role: 'admin',
    },
  });

  // Create default settings
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      websiteName: 'Coltion Product Investment',
      websiteDescription: 'Premium Investment Platform',
      supportEmail: 'support@coltionproduct.com',
      supportPhone: '+63 900 000 0000',
      companyAddress: 'Metro Manila, Philippines',
      footerCopyright: '© 2026 Coltion Product Investment. All rights reserved.',
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing scheduled maintenance.',
      referralCommissionPercent: 30,
      paymentMethods: JSON.stringify({ GCash: true, Maya: true, QRPH: true }),
      withdrawalsEnabled: true,
      registrationEnabled: true,
      loginEnabled: true,
      maxLoginAttempts: 5,
      lockDurationMinutes: 30,
      sessionTimeoutMinutes: 60,
      passwordMinLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: false,
      rememberMeDays: 30,
      twoFactorEnabled: false,
      emailVerificationRequired: true,
      mobileVerificationRequired: true,
      maxUploadSizeMB: 10,
      allowedImageTypes: 'jpg,png,svg,webp',
      allowedDocumentTypes: 'pdf,doc,docx',
      maxVerificationFileSizeMB: 5,
      ipWhitelistEnabled: false,
      ipWhitelist: '[]',
      ipBlacklist: '[]',
      countryRestrictions: '{}',
      blockedCountryMessage: 'Service unavailable in your country.',
      withdrawalMaintenanceMessage: 'Withdrawals temporarily unavailable.',
    },
  });

  // Create VIP plans
  const vipPlans = [
    { name: 'Starter', buyAmount: 100, dailyRate: 1.5, dailyProfit: 1.5, duration: 30, totalReturn: 145, badge: '🥇' },
    { name: 'Bronze', buyAmount: 500, dailyRate: 1.8, dailyProfit: 9, duration: 30, totalReturn: 770, badge: '🥈' },
    { name: 'Silver', buyAmount: 1000, dailyRate: 2.0, dailyProfit: 20, duration: 30, totalReturn: 1600, badge: '🥉' },
    { name: 'Gold', buyAmount: 5000, dailyRate: 2.2, dailyProfit: 110, duration: 30, totalReturn: 8300, badge: '⭐' },
    { name: 'Platinum', buyAmount: 10000, dailyRate: 2.5, dailyProfit: 250, duration: 30, totalReturn: 17500, badge: '💎' },
    { name: 'Diamond', buyAmount: 50000, dailyRate: 3.0, dailyProfit: 1500, duration: 30, totalReturn: 95000, badge: '👑' },
  ];

  for (const plan of vipPlans) {
    await prisma.vipPlan.upsert({
      where: { id: vipPlans.indexOf(plan) + 1 },
      update: plan,
      create: plan,
    });
  }

  console.log('Seed complete!');
  console.log('Admin login: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });