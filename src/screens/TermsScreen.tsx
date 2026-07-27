import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { APP_NAME } from '../constants';

interface TermsProps {
  onClose: () => void;
}

export const TermsScreen: React.FC<TermsProps> = React.memo(({ onClose }) => {
  const sections = [
    {
      title: 'Acceptance of Terms',
      content: `By creating an account or using ${APP_NAME}, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you must not use our platform. We reserve the right to modify these terms at any time, with changes effective upon posting.`,
    },
    {
      title: 'Eligibility',
      content: 'You must be at least 18 years old to use our platform. By registering, you represent that you are legally capable of entering into binding contracts. You must provide accurate, current, and complete information during registration and maintain the accuracy of such information.',
    },
    {
      title: 'User Responsibilities',
      content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. You must not use the platform for any illegal or unauthorized purpose.',
    },
    {
      title: 'Investment Risks',
      content: 'All investments carry inherent risks, including the potential loss of principal. Past performance does not guarantee future results. You acknowledge that you have read and understood the risk disclosures before making any investment. We do not provide financial advice, and all investment decisions are your own.',
    },
    {
      title: 'Account Security',
      content: 'You are required to use strong passwords, enable two-factor authentication when available, and keep your login credentials secure. We implement security measures to protect your account, but you are ultimately responsible for safeguarding your account access.',
    },
    {
      title: 'Deposits',
      content: 'Deposits can be made through approved payment methods. Processing times vary by method. All deposits are subject to verification before being credited to your account. We reserve the right to reject any deposit that does not comply with our policies or regulatory requirements.',
    },
    {
      title: 'Withdrawals',
      content: 'Withdrawal requests are processed according to our withdrawal schedule. Standard processing time is 1-3 business days. Minimum withdrawal amounts apply. We may require additional verification before processing withdrawals. Withdrawal fees may apply based on the method selected.',
    },
    {
      title: 'VIP Plans',
      content: 'VIP Investment Plans are subject to specific terms including minimum investment amounts, lock-in periods, and return rates as displayed on the platform. Early withdrawal may not be permitted or may incur penalties. Plan terms are clearly stated at the time of purchase.',
    },
    {
      title: 'Rewards and Bonuses',
      content: 'Promotional rewards, bonuses, and referrals are subject to specific terms and conditions. We reserve the right to modify, suspend, or cancel any promotion at any time. Attempts to abuse the reward system may result in forfeiture of rewards and account suspension.',
    },
    {
      title: 'Referral Program',
      content: 'Our referral program allows you to earn rewards by referring new users. Referral rewards are credited after the referred user meets specific criteria. Fraudulent referral activities, including self-referrals or fake accounts, are strictly prohibited and will result in disqualification.',
    },
    {
      title: 'Prohibited Activities',
      content: 'You agree not to engage in any of the following: money laundering, fraud, unauthorized access, hacking, phishing, distributing malware, manipulating the platform, using automated tools to create accounts, engaging in any activity that violates applicable laws or regulations.',
    },
    {
      title: 'Account Suspension',
      content: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in suspicious activity, provide false information, or pose a security risk. You will be notified of such actions and may appeal the decision through our support channels.',
    },
    {
      title: 'Limitation of Liability',
      content: `${APP_NAME} and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform. Our total liability is limited to the amount of fees paid by you in the 12 months preceding the claim.`,
    },
    {
      title: 'Intellectual Property',
      content: `All content, trademarks, logos, and intellectual property on the ${APP_NAME} platform are owned by or licensed to us. You may not reproduce, distribute, modify, or create derivative works without our explicit written consent.`,
    },
    {
      title: 'Governing Law',
      content: 'These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these terms shall be resolved through arbitration in accordance with the rules of the Philippine Dispute Resolution Center.',
    },
    {
      title: 'Contact Information',
      content: 'For questions, concerns, or inquiries regarding these Terms & Conditions, please contact our support team at support@coltionproduct.com. We strive to respond to all inquiries within 24-48 business hours.',
    },
  ];

  const lastUpdated = 'Effective Date: January 1, 2026 | Last Updated: July 27, 2026';

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(12px, 2vh, 20px) clamp(16px, 3vw, 32px)',
          borderBottom: `1px solid ${colors.borderDefault}`,
          background: colors.bgSecondary,
          flexShrink: 0,
        }}
      >
        <motion.button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colors.textSecondary,
            fontSize: typography.base,
            fontFamily: typography.fontFamily,
            fontWeight: typography.medium,
            background: colors.bgGlass,
            border: `1px solid ${colors.borderDefault}`,
            borderRadius: borderRadius.sm,
            padding: 'clamp(6px, 1vh, 8px) clamp(10px, 1.5vw, 14px)',
            cursor: 'pointer',
          }}
          whileHover={{ background: colors.bgGlassLight }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </motion.button>
        <h2 style={{
          fontSize: typography.lg,
          fontWeight: typography.bold,
          color: colors.textPrimary,
          fontFamily: typography.fontFamily,
        }}>
          Terms & Conditions
        </h2>
        <div style={{ width: 'clamp(60px, 10vw, 100px)' }} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'clamp(16px, 3vw, 40px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            maxWidth: 'clamp(320px, 80vw, 800px)',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(20px, 3vh, 32px)',
          }}
        >
          {/* Last Updated */}
          <p style={{
            fontSize: typography.sm,
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
            fontStyle: 'italic',
          }}>
            {lastUpdated}
          </p>

          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <h3 style={{
                fontSize: typography.lg,
                fontWeight: typography.bold,
                color: colors.textPrimary,
                fontFamily: typography.fontFamily,
                marginBottom: 'clamp(6px, 1vh, 10px)',
              }}>
                {section.title}
              </h3>
              <p style={{
                fontSize: typography.base,
                color: colors.textSecondary,
                fontFamily: typography.fontFamily,
                lineHeight: typography.relaxed,
              }}>
                {section.content}
              </p>
            </motion.div>
          ))}

          <div style={{ height: 'clamp(40px, 5vh, 60px)' }} />
        </div>
      </div>
    </motion.div>
  );
});

TermsScreen.displayName = 'TermsScreen';