import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAuth } from '../services/adminAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { id: 'users', label: 'Users', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', badge: 0 },
  { id: 'deposits', label: 'Deposits', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', badge: 0 },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', badge: 0 },
  { id: 'orders', label: 'Orders', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' },
  { id: 'transactions', label: 'Transactions', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id: 'verification', label: 'Verification', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', badge: 0 },
  { id: 'settings', label: 'Website Control', icon: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z', badge: 0 },
];

function getBadges(id: string): number {
  try {
    const txs = JSON.parse(localStorage.getItem('coltion_transactions') || '[]');
    const verifications = JSON.parse(localStorage.getItem('coltion_verifications') || '[]');
    switch (id) {
      case 'deposits': return txs.filter((t: any) => t.type === 'deposit' && t.status === 'pending').length;
      case 'withdrawals': return txs.filter((t: any) => t.type === 'withdrawal' && t.status === 'pending').length;
      case 'verification': return verifications.filter((v: any) => v.status === 'PENDING').length;
      case 'users': return 0;
      default: return 0;
    }
  } catch { return 0; }
}

export const AdminLayout: React.FC<AdminLayoutProps> = React.memo(({ children, activePage, onNavigate, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const session = adminAuth.getSession();

  const sidebarWidth = collapsed ? '72px' : 'clamp(220px, 18vw, 260px)';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: '#0A0E1A' }}>
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          background: 'rgba(17,24,39,0.9)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 12px' : '20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'padding 0.3s ease',
        }}>
          {!collapsed && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #0066FF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Coltion
              </h2>
              <p style={{ fontSize: '11px', color: '#6B7280', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                {session?.name || 'Admin'} · {session?.role || 'Administrator'}
              </p>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0066FF, #00D4FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif",
            }}>
              C
            </div>
          )}
          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '24px', height: '24px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.05)', border: 'none',
              display: collapsed ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#6B7280', flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflow: 'auto', padding: collapsed ? '8px' : '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(item => {
            const isActive = activePage === item.id;
            const isHovered = hoveredItem === item.id;
            const badge = getBadges(item.id);

            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px',
                  padding: collapsed ? '10px' : '10px 14px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(0,102,255,0.15), rgba(0,102,255,0.05))'
                    : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,102,255,0.15)' : '1px solid transparent',
                  borderRadius: '10px', cursor: 'pointer',
                  color: isActive ? '#FFFFFF' : '#9CA3AF',
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <motion.div layoutId="activeIndicator" style={{
                    position: 'absolute', left: '-1px', top: '50%', transform: 'translateY(-50%)',
                    width: '3px', height: '20px', borderRadius: '0 4px 4px 0',
                    background: '#0066FF', boxShadow: '0 0 12px rgba(0,102,255,0.5)',
                  }} />
                )}

                {/* Icon with hover glow */}
                <div style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width={collapsed ? '20' : '18'} height={collapsed ? '20' : '18'} viewBox="0 0 24 24" fill="none"
                    stroke={isActive ? '#0066FF' : 'currentColor'} strokeWidth={isActive ? 2 : 1.5}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <path d={item.icon} />
                    {item.id === 'users' && <circle cx="9" cy="7" r="4" />}
                    {item.id === 'verification' && <circle cx="12" cy="12" r="10" />}
                  </svg>
                  {isHovered && !isActive && (
                    <div style={{
                      position: 'absolute', inset: '-4px',
                      borderRadius: '50%', background: 'rgba(0,102,255,0.1)',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>

                {/* Label */}
                {!collapsed && item.label}

                {/* Badge */}
                {!collapsed && badge > 0 && (
                  <span style={{
                    marginLeft: 'auto', minWidth: '20px', height: '20px', borderRadius: '10px',
                    background: '#EF4444', color: '#FFFFFF', fontSize: '10px', fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                    animation: 'pulse 2s infinite',
                  }}>
                    {badge}
                  </span>
                )}

                {/* Collapsed badge dot */}
                {collapsed && badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)',
                  }} />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: collapsed ? '8px' : '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.button
            onClick={onLogout}
            whileHover={{ x: 2 }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px',
              padding: collapsed ? '10px' : '10px 14px',
              background: 'transparent', border: '1px solid transparent', borderRadius: '10px',
              cursor: 'pointer', color: '#EF4444', fontSize: '13px', fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width={collapsed ? '20' : '18'} height={collapsed ? '20' : '18'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && 'Logout'}
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{
        marginLeft: sidebarWidth,
        flex: 1, minHeight: '100dvh',
        transition: 'margin-left 0.3s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

AdminLayout.displayName = 'AdminLayout';