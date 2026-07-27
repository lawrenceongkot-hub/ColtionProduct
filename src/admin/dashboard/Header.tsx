import React from 'react';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  currentTime: string;
  adminName: string;
  adminRole: string;
  notifications: any[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<HeaderProps> = React.memo(({
  currentTime, adminName, adminRole, notifications, darkMode, onToggleDarkMode, onLogout,
}) => {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(17,24,39,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Left - Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '400px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          width: '100%',
          transition: 'border-color 0.2s ease',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search users, transactions..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
            }}
          />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif" }}>⌘K</span>
        </div>
      </div>

      {/* Right - Time, Notifications, Profile, Dark Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Current Time */}
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif",
          fontWeight: 500, padding: '4px 10px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {currentTime}
        </div>

        {/* Dark Mode Toggle */}
        <button onClick={onToggleDarkMode} style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#9CA3AF',
          transition: 'all 0.2s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        {/* Server Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '8px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span style={{ fontSize: '10px', color: '#10B981', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Live</span>
        </div>

        {/* Notifications */}
        <NotificationCenter notifications={notifications} />

        {/* Admin Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '4px 10px 4px 4px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #0066FF, #00D4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif",
          }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#E5E7EB', fontFamily: "'Inter', sans-serif" }}>{adminName}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>{adminRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';