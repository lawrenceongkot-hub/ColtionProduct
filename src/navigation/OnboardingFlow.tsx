import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { AuthWelcomeScreen } from '../screens/AuthWelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { MaintenancePage } from '../screens/MaintenancePage';
import { AppLayout } from '../layouts/AppLayout';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsScreen } from '../screens/TermsScreen';
import { settingsEnforcer } from '../services/settingsEnforcer';

type Screen = 'splash' | 'loading' | 'auth' | 'login' | 'register' | 'home';
type Modal = 'privacy' | 'terms' | null;

export const OnboardingFlow: React.FC = React.memo(() => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return isAuthenticated ? 'home' : 'splash';
  });
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [maintenanceBlocked, setMaintenanceBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setCurrentScreen('home');
      } else {
        // Check maintenance mode from backend
        settingsEnforcer.isMaintenanceMode().then(result => {
          if (result.blocked) {
            setMaintenanceBlocked(result.message);
          } else {
            setCurrentScreen('splash');
          }
        });
      }
    }
  }, [isAuthenticated, isLoading]);

  const handleSplashComplete = useCallback(() => {
    setCurrentScreen('loading');
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setCurrentScreen('auth');
  }, []);

  const handleNavigate = useCallback((screen: 'login' | 'register' | 'auth') => {
    if (screen === 'auth') {
      setActiveModal(null);
    }
    setCurrentScreen(screen);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentScreen('auth');
  }, []);

  const openPrivacy = useCallback(() => setActiveModal('privacy'), []);
  const openTerms = useCallback(() => setActiveModal('terms'), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  if (isLoading) {
    return null; // or a minimal loading state
  }

  if (isAuthenticated) {
    return <AppLayout />;
  }

  // Show full-screen maintenance page if blocked
  if (maintenanceBlocked) {
    return <MaintenancePage />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {currentScreen === 'splash' && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}
        {currentScreen === 'loading' && (
          <LoadingScreen key="loading" onComplete={handleLoadingComplete} />
        )}
        {currentScreen === 'auth' && (
          <AuthWelcomeScreen
            key="auth"
            onNavigate={handleNavigate}
            onPrivacy={openPrivacy}
            onTerms={openTerms}
          />
        )}
        {currentScreen === 'login' && (
          <LoginScreen
            key="login"
            onNavigate={handleNavigate}
            onBack={handleBack}
            onPrivacy={openPrivacy}
            onTerms={openTerms}
          />
        )}
        {currentScreen === 'register' && (
          <RegisterScreen
            key="register"
            onNavigate={handleNavigate}
            onBack={handleBack}
            onPrivacy={openPrivacy}
            onTerms={openTerms}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'privacy' && (
          <PrivacyPolicyScreen key="privacy" onClose={closeModal} />
        )}
        {activeModal === 'terms' && (
          <TermsScreen key="terms" onClose={closeModal} />
        )}
      </AnimatePresence>
    </>
  );
});

OnboardingFlow.displayName = 'OnboardingFlow';