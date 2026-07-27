import React from 'react';
import type { OnlineUser } from '../services/dashboardService';

interface OnlineUsersProps {
  users: OnlineUser[];
}

export const OnlineUsers: React.FC<OnlineUsersProps> = React.memo(({ users }) => {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
          Online Users
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)',
          }} />
          <span style={{ fontSize: '12px', color: '#10B981', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
            {users.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflow: 'auto' }}>
        {users.map((user) => (
          <div key={user.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            transition: 'background 0.2s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            {/* Avatar */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0066FF, #00D4FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif", flexShrink: 0,
              position: 'relative',
            }}>
              {user.avatar}
              <span style={{
                position: 'absolute', bottom: '-1px', right: '-1px',
                width: '9px', height: '9px', borderRadius: '50%',
                background: user.status === 'online' ? '#10B981' : '#F59E0B',
                border: '2px solid #111827',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB', fontFamily: "'Inter', sans-serif" }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                {user.currentPage} · {user.device}
              </div>
            </div>

            {/* Time */}
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", textAlign: 'right', flexShrink: 0 }}>
              {user.loginTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

OnlineUsers.displayName = 'OnlineUsers';