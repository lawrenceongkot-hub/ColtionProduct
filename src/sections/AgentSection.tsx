import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { settingsEnforcer } from '../services/settingsEnforcer';
import { FORMAT_CURRENCY } from '../constants';

interface AgentSectionProps {
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Who can become an Agent?',
    a: 'All registered Coltion Product members can participate in the Agent Invitation Program. There is no special qualification or upgrade required.',
  },
  {
    q: 'How do I earn commissions?',
    a: 'Share your unique invitation link or code with friends. When they register and make their first successful deposit, you automatically earn a referral commission.',
  },
  {
    q: 'When is the commission credited?',
    a: 'The commission is credited to your Main Wallet immediately after the referred user\'s deposit is approved by our admin team.',
  },
  {
    q: 'Is there a limit on how many people I can invite?',
    a: 'No. You can invite unlimited friends and earn commissions on each one\'s first successful deposit. There is no cap on total earnings.',
  },
  {
    q: 'Can I withdraw my referral commissions?',
    a: 'Yes. Referral commissions are credited directly to your Main Wallet and can be withdrawn or used to purchase VIP plans.',
  },
  {
    q: 'What if my referral makes multiple deposits?',
    a: 'Only the first successful deposit of each referred user qualifies for the referral commission. Future deposits by the same user do not earn additional commission.',
  },
];

export const AgentSection: React.FC<AgentSectionProps> = React.memo(({ onBack }) => {
  const { user } = useAuth();
  const [commissionRate, setCommissionRate] = useState(30);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    settingsEnforcer.getSettings().then(s => {
      if (s?.referralCommissionPercent) {
        setCommissionRate(s.referralCommissionPercent);
      }
    });
  }, []);

  const exampleDeposits = [100, 500, 1000, 5000, 10000];

  if (!user) return null;

  return (
    <div style={{ maxWidth: 'clamp(320px, 90vw, 800px)', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: 'clamp(40px, 5vh, 60px)' }}>
      <motion.button onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: typography.sm, fontFamily: typography.fontFamily, fontWeight: typography.medium, background: colors.bgGlass, border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.sm, padding: '6px 12px', cursor: 'pointer', marginBottom: 'clamp(16px, 2.5vh, 24px)' }}
        whileHover={{ background: colors.bgGlassLight }} whileTap={{ scale: 0.95 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>Back
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2.5vh, 24px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 'clamp(48px, 6vw, 56px)', height: 'clamp(48px, 6vw, 56px)', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div>
            <h2 style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Agent Invitation Program</h2>
            <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: '2px' }}>Learn how the referral system works and earn {commissionRate}% commissions.</p>
          </div>
        </div>

        {/* What is the Agent Program */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>What is the Agent Program?</h3>
          <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed }}>
            The Agent Invitation Program rewards you for growing our community. When you invite friends to join Coltion Product, you earn a {commissionRate}% referral commission on their first successful deposit. It's a win-win — your friends get access to secure investment opportunities, and you earn passive income.
          </p>
          <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed }}>
            There are no fees, no requirements, and no limits. Every member automatically becomes an agent when they share their unique invitation link.
          </p>
        </div>

        {/* How to Invite Friends */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>How to Invite Friends</h3>
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, text: 'Open the "Invite" tab in your app to find your unique invitation link and code.' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, text: 'Share your invitation link on Facebook, Messenger, Telegram, WhatsApp, or any social platform.' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, text: 'Your friend registers using your invitation link or enters your invitation code during sign-up.' },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>, text: `When your friend makes their first successful deposit, you automatically earn ${commissionRate}% commission.` },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>, text: 'Track all your referrals, deposits, and commissions in real time from the "Invite" dashboard.' },
          ].map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: borderRadius.md, background: colors.gradientBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textPrimary, flexShrink: 0 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{step.text}</p>
              </div>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.bgGlassMedium, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.xs, fontWeight: typography.bold, color: colors.primary, flexShrink: 0 }}>{i + 1}</div>
            </motion.div>
          ))}
        </div>

        {/* Commission Explanation */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>How Referral Commission Works</h3>
          {[
            `Earn ${commissionRate}% commission on every successful deposit made by your referred users.`,
            'Commission is calculated based on the actual deposit amount.',
            'Referral commissions are credited automatically to your Main Wallet after the deposit is approved.',
            'Only approved deposits generate referral commissions — pending or failed deposits do not qualify.',
            'Only the first successful deposit of each referred user qualifies for commission.',
            'You can withdraw your commissions or use them to purchase VIP plans.',
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: typography.base, color: colors.success, flexShrink: 0, lineHeight: 1.4 }}>✔</span>
              <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{item}</p>
            </motion.div>
          ))}
        </div>

        {/* Example Calculation */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Commission Calculation Examples</h3>
          <div style={{ overflow: 'hidden', borderRadius: borderRadius.md, border: `1px solid ${colors.borderDefault}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.sm }}>
              <thead>
                <tr style={{ background: colors.bgGlassMedium }}>
                  <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'left', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friend Deposit</th>
                  <th style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.textSecondary, fontWeight: typography.semibold, fontFamily: typography.fontFamily, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Commission ({commissionRate}%)</th>
                </tr>
              </thead>
              <tbody>
                {exampleDeposits.map((dep, i) => (
                  <tr key={dep} style={{ borderTop: `1px solid ${colors.borderDefault}`, background: i % 2 === 0 ? 'transparent' : colors.bgGlass }}>
                    <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', color: colors.textPrimary, fontFamily: typography.fontFamily }}>{FORMAT_CURRENCY(dep)}</td>
                    <td style={{ padding: 'clamp(10px, 1.5vh, 14px)', textAlign: 'right', color: colors.success, fontFamily: typography.fontFamily, fontWeight: typography.semibold }}>{FORMAT_CURRENCY(dep * commissionRate / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: typography.xs, color: colors.textTertiary, fontFamily: typography.fontFamily }}>Commission is calculated as {commissionRate}% of each successful approved deposit.</p>
        </div>

        {/* Terms & Conditions */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, padding: 'clamp(20px, 3vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Terms & Conditions</h3>
          {[
            'Referral commissions are only earned from the referred user\'s first successful and approved deposit.',
            'Commissions are calculated automatically by the system based on the actual deposit amount.',
            'You must be a registered member of Coltion Product to participate in the Agent Program.',
            'The commission rate ({commissionRate}%) is determined by platform settings and may be adjusted by the administration.',
            'Fraudulent, duplicate, or self-referrals are strictly prohibited and may result in account suspension.',
            'Commissions are non-transferable and cannot be exchanged for cash outside the platform.',
            'The platform reserves the right to modify the referral program terms at any time.',
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: typography.xs, color: colors.textTertiary, flexShrink: 0, fontWeight: typography.semibold, marginTop: '2px' }}>{i + 1}.</span>
              <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.snug }}>{item}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ width: '100%', background: colors.gradientGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${colors.borderDefault}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
          <div style={{ padding: 'clamp(16px, 2.5vw, 24px)', borderBottom: `1px solid ${colors.borderDefault}` }}>
            <h3 style={{ fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary, fontFamily: typography.fontFamily }}>Frequently Asked Questions</h3>
          </div>
          {FAQ_ITEMS.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? `1px solid ${colors.borderDefault}` : 'none' }}>
              <motion.button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(14px, 2vh, 18px) clamp(16px, 2.5vw, 24px)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                whileHover={{ background: colors.bgGlass }}
              >
                <p style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, fontFamily: typography.fontFamily, flex: 1 }}>{faq.q}</p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.button>
              {openFaq === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} style={{ padding: '0 clamp(16px, 2.5vw, 24px) clamp(14px, 2vh, 18px)' }}>
                  <p style={{ fontSize: typography.sm, color: colors.textSecondary, fontFamily: typography.fontFamily, lineHeight: typography.relaxed }}>{faq.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
});

AgentSection.displayName = 'AgentSection';