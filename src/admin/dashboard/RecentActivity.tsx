import React from 'react';

interface RecentActivityType {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface RecentActivityProps {
  activities: RecentActivityType[];
}

const activityIcons: Record<string, string> = {
  user: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
  deposit: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  withdrawal: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  vip: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  bonus: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  referral: 'M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  kyc: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

const activityColors: Record<string, string> = {
  user: '#10B981',
  deposit: '#0066FF',
  withdrawal: '#EF4444',
  vip: '#F59E0B',
  bonus: '#8B5CF6',
  referral: '#EC4899',
  kyc: '#06B6D4',
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

export const RecentActivityFeed: React.FC<RecentActivityProps> = React.memo(({ activities }) => {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
      height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
          Recent Activity
        </h3>
        <span style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif",
          background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px',
        }}>
          Live
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
        {activities.map((activity) => {
          const color = activityColors[activity.type] || '#0066FF';
          const path = activityIcons[activity.type] || activityIcons.user;
          return (
            <div key={activity.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '8px 10px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              transition: 'background 0.2s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: `1px solid ${color}22`,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={path} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", fontWeight: 500, lineHeight: 1.4 }}>
                  {activity.message}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                  {formatTimeAgo(activity.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
});

RecentActivityFeed.displayName = 'RecentActivityFeed';