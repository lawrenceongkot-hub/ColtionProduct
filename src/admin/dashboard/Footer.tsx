import React from 'react';

interface FooterProps {
  dbConnected: boolean;
  serverOnline: boolean;
}

export const DashboardFooter: React.FC<FooterProps> = React.memo(({ dbConnected, serverOnline }) => {
  return (
    <footer style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      marginTop: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
          Coltion Product Investment
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>·</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif" }}>
          Version 1.0
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: dbConnected ? '#10B981' : '#EF4444',
            boxShadow: dbConnected ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
          }} />
          <span style={{ fontSize: '10px', color: dbConnected ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Database {dbConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: serverOnline ? '#10B981' : '#EF4444',
            boxShadow: serverOnline ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
          }} />
          <span style={{ fontSize: '10px', color: serverOnline ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Server {serverOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontFamily: "'Inter', sans-serif" }}>
          &copy; 2026
        </span>
      </div>
    </footer>
  );
});

DashboardFooter.displayName = 'DashboardFooter';