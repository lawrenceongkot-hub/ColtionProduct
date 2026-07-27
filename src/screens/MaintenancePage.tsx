import React from 'react';

export const MaintenancePage: React.FC = React.memo(() => {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0066FF',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      {/* Logo */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          fontSize: '36px',
          fontWeight: 800,
          color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
        }}>
          C
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 'clamp(28px, 5vw, 42px)',
        fontWeight: 700,
        color: '#FFFFFF',
        marginBottom: '16px',
        letterSpacing: '-0.5px',
      }}>
        We'll Be Back Soon!
      </h1>

      {/* Body */}
      <p style={{
        fontSize: 'clamp(14px, 2vw, 16px)',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.7,
        maxWidth: '560px',
        marginBottom: '24px',
        fontWeight: 400,
      }}>
        Dear Valued Members,<br /><br />
        Our platform is currently undergoing scheduled system maintenance to improve performance, enhance security, and provide a better investment experience.<br /><br />
        During this time, some or all services may be temporarily unavailable, including:
      </p>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
        marginBottom: '24px', maxWidth: '560px',
      }}>
        {[
          '🔐 Login & Registration',
          '💰 Deposits',
          '💸 Withdrawals',
          '💎 VIP Plan Purchases',
          '📈 Investment Orders',
          '👥 Referral System',
          '👤 Account Management',
        ].map(service => (
          <span key={service} style={{
            padding: '6px 14px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.1)',
            fontSize: '13px', color: 'rgba(255,255,255,0.8)',
            fontWeight: 500,
          }}>
            {service}
          </span>
        ))}
      </div>
      <p style={{
        fontSize: 'clamp(14px, 2vw, 16px)',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.7,
        maxWidth: '560px',
        marginBottom: '32px',
        fontWeight: 400,
      }}>
        We apologize for any inconvenience this may cause and appreciate your patience while we complete these important upgrades.
      </p>

      {/* Support */}
      <div style={{
        padding: '16px 24px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
      }}>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 500,
        }}>
          For urgent concerns, please contact{' '}
          <a href="mailto:support@coltionproduct.com" style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'underline' }}>
            support@coltionproduct.com
          </a>
        </p>
      </div>
    </div>
  );
});

MaintenancePage.displayName = 'MaintenancePage';