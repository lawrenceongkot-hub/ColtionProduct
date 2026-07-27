import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { DesktopHeader } from '../components/DesktopHeader';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { LogoutDialog } from '../components/LogoutDialog';
import { HomeSection } from '../sections/HomeSection';
import { OrderSection } from '../sections/OrderSection';
import { InviteSection } from '../sections/InviteSection';
import { AccountSection } from '../sections/AccountSection';
import { MaintenancePage } from '../screens/MaintenancePage';

type Section = 'home' | 'order' | 'invite' | 'account';

export const AppLayout: React.FC = React.memo(() => {
  const { logout } = useAuth();
  const responsive = useResponsive();
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Check maintenance mode on mount and when settings change
  useEffect(() => {
    const checkMaintenance = () => {
      try {
        const settings = JSON.parse(localStorage.getItem('coltion_settings') || '{}');
        if (settings.maintenanceMode) {
          const adminSession = localStorage.getItem('coltion_admin_session');
          if (!adminSession) {
            setMaintenanceMode(true);
            return;
          }
        }
        setMaintenanceMode(false);
      } catch {
        setMaintenanceMode(false);
      }
    };
    checkMaintenance();
    window.addEventListener('settings:updated', checkMaintenance);
    window.addEventListener('dashboard:update', checkMaintenance);
    return () => {
      window.removeEventListener('settings:updated', checkMaintenance);
      window.removeEventListener('dashboard:update', checkMaintenance);
    };
  }, []);

  if (maintenanceMode) {
    return <MaintenancePage />;
  }

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section as Section);
  }, []);

  const handleShowLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const handleCancelLogout = useCallback(() => {
    setShowLogoutDialog(false);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setShowLogoutDialog(false);
    logout();
  }, [logout]);

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <HomeSection />;
      case 'order':
        return <OrderSection />;
      case 'invite':
        return <InviteSection />;
      case 'account':
        return <AccountSection />;
      default:
        return <HomeSection />;
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Desktop Header */}
      <DesktopHeader
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleShowLogout}
        showLogoutConfirm={handleShowLogout}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          paddingBottom: responsive.isMobile ? 'clamp(70px, 12vh, 90px)' : '0',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* Logout Dialog */}
      <LogoutDialog
        isOpen={showLogoutDialog}
        onCancel={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
});

AppLayout.displayName = 'AppLayout';