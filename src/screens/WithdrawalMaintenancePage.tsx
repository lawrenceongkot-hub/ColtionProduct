import React from 'react';

interface WithdrawalMaintenancePageProps {
  onBack: () => void;
}

export const WithdrawalMaintenancePage: React.FC<WithdrawalMaintenancePageProps> = React.memo(({ onBack }) => {
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
        fontSize: 'clamp(24px, 4vw, 36px)',
        fontWeight: 700,
        color: '#FFFFFF',
        marginBottom: '16px',
        letterSpacing: '-0.5px',
      }}>
        Withdrawal Service Temporarily Unavailable
      </h1>

      {/* Body */}
      <p style={{
        fontSize: 'clamp(14px, 2vw, 16px)',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.7,
        maxWidth: '560px',
        marginBottom: '32px',
        fontWeight: 400,
      }}>
        Dear Valued Members,<br /><br />
        Our Withdrawal System is currently undergoing scheduled maintenance to improve transaction processing, security, and overall service reliability.<br /><br />
        Please try again later. Thank you for your patience and understanding.
      </p>

      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          padding: '14px 32px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        Back to Dashboard
      </button>
    </div>
  );
});

WithdrawalMaintenancePage.displayName = 'WithdrawalMaintenancePage';