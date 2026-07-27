import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { APP_NAME } from '../constants';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyProps> = React.memo(({ onClose }) => {
  const sections = [
    {
      title: 'Introduction',
      content: `Welcome to ${APP_NAME}. We are committed to protecting your personal information and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our investment platform and related services. By creating an account or using our services, you agree to the collection and use of information in accordance with this policy.`,
    },
    {
      title: 'Information We Collect',
      content: 'We collect several types of information to provide and improve our services to you. This includes information you provide directly, information collected automatically, and information from third-party sources.',
    },
    {
      title: 'Account Information',
      content: 'When you register for an account, we collect your full name, email address, mobile number, and account credentials. This information is necessary to create and maintain your account, verify your identity, and communicate with you about your investments.',
    },
    {
      title: 'Identity Verification',
      content: 'To comply with regulatory requirements and prevent fraud, we may collect government-issued identification documents, proof of address, and other verification information. This data is securely stored and used solely for identity verification and compliance purposes.',
    },
    {
      title: 'Device Information',
      content: 'We automatically collect certain information about your device when you access our platform, including IP address, browser type, operating system, device identifiers, and usage patterns. This helps us optimize your experience, detect suspicious activity, and improve our services.',
    },
    {
      title: 'Financial Information',
      content: 'We collect transaction data related to your investments, deposits, and withdrawals. This includes payment method details, transaction amounts, dates, and account balances. We use secure third-party payment processors and do not store complete payment card information on our servers.',
    },
    {
      title: 'Data Usage',
      content: 'We use the collected data to operate, maintain, and improve our platform; process transactions; verify your identity; communicate with you; send important account notifications; detect and prevent fraud; comply with legal obligations; and analyze usage trends to enhance user experience.',
    },
    {
      title: 'Security',
      content: 'We implement industry-standard security measures including 256-bit SSL encryption, multi-factor authentication, regular security audits, and strict access controls. Your data is stored on secure servers with 24/7 monitoring. However, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security.',
    },
    {
      title: 'Cookies',
      content: 'We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand where our users come from. You can control cookie preferences through your browser settings. Disabling cookies may affect certain features of our platform.',
    },
    {
      title: 'User Rights',
      content: 'You have the right to access, update, or delete your personal information at any time. You may request a copy of your data, restrict processing, object to processing, and request data portability. To exercise these rights, contact our support team. We will respond to your request within 30 days.',
    },
    {
      title: 'Data Retention',
      content: 'We retain your personal information for as long as your account is active or as needed to provide services. After account closure, we retain certain data for legal, regulatory, and audit purposes for a period of 5 years. You may request earlier deletion of your data, subject to legal obligations.',
    },
    {
      title: 'Third-Party Services',
      content: 'We may share your information with trusted third-party service providers who assist in operating our platform, processing payments, verifying identities, and analyzing data. These providers are contractually bound to protect your data and use it only for the specified purposes.',
    },
    {
      title: 'Contact Information',
      content: `If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our Data Protection Officer at privacy@coltionproduct.com or through our support channels. We are committed to addressing your concerns promptly.`,
    },
    {
      title: 'Updates to Policy',
      content: 'We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through a prominent notice on our platform. Continued use of our services after changes constitutes acceptance of the updated policy. We encourage you to review this policy periodically.',
    },
  ];

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
          Privacy Policy
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

PrivacyPolicyScreen.displayName = 'PrivacyPolicyScreen';