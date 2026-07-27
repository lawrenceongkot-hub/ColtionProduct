import React from 'react';

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  onClick: () => void;
  badge?: number;
}

interface QuickActionsProps {
  onNavigate: (page: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({ onNavigate }) => {
  const actions: QuickAction[] = [
    { label: 'Approve Deposits', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#10B981', onClick: () => onNavigate('deposits') },
    { label: 'Approve Withdrawals', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: '#F59E0B', onClick: () => onNavigate('withdrawals') },
    { label: 'Review KYC', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#8B5CF6', onClick: () => onNavigate('verification') },
    { label: 'Add VIP Plan', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', color: '#EC4899', onClick: () => onNavigate('vip') },
    { label: 'Website Control', icon: 'M3 3h18v18H3V3zm4 4h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z', color: '#06B6D4', onClick: () => onNavigate('settings') },
    { label: 'Send Announcement', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', color: '#F97316', onClick: () => onNavigate('announcements') },
    { label: 'Create Promotion', icon: 'M11 3.055A9.001 9.001 0 1 0 20.945 13H11V3.055z', color: '#0066FF', onClick: () => onNavigate('promotions') },
    { label: 'User Management', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', color: '#10B981', onClick: () => onNavigate('users') },
  ];

  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '14px' }}>
        Quick Actions
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            cursor: 'pointer', width: '100%', textAlign: 'left',
            transition: 'all 0.2s ease',
            color: '#D1D5DB', fontSize: '12px', fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${action.color}12`;
              e.currentTarget.style.borderColor = `${action.color}22`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
            }}
          >
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: `${action.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={action.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={action.icon} />
              </svg>
            </div>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';