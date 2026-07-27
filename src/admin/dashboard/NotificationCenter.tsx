import React, { useState } from 'react';

interface NotifItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  notifications: NotifItem[];
}

const notificationColors: Record<string, string> = {
  registration: '#10B981',
  deposit: '#0066FF',
  withdrawal: '#EF4444',
  kyc: '#F59E0B',
  vip: '#8B5CF6',
};

const notificationIcons: Record<string, string> = {
  registration: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
  deposit: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  withdrawal: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  kyc: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  vip: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = React.memo(({ notifications }) => {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          width: '38px', height: '38px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#9CA3AF',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '18px', height: '18px', borderRadius: '9px',
            background: '#EF4444', color: '#FFFFFF',
            fontSize: '10px', fontWeight: 700, fontFamily: "'Inter', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
          }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: '340px', maxHeight: '420px', overflow: 'auto',
            background: '#1A2235', borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            zIndex: 1000, padding: '12px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '10px', padding: '0 4px' }}>
              Notifications
            </div>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
                No notifications
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {notifications.map((n) => {
                  const color = notificationColors[n.type] || '#0066FF';
                  const path = notificationIcons[n.type] || notificationIcons.registration;
                  return (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '8px 10px', borderRadius: '10px',
                      background: !n.read ? 'rgba(0,102,255,0.06)' : 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'rgba(0,102,255,0.06)' : 'transparent'}
                    >
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '7px',
                        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={path} />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", fontWeight: 500, lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                          {formatTimeAgo(n.timestamp)}
                        </div>
                      </div>
                      {!n.read && (
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: '#0066FF', marginTop: '4px', flexShrink: 0,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

NotificationCenter.displayName = 'NotificationCenter';