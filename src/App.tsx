import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { OnboardingFlow } from './navigation/OnboardingFlow';
import { AdminPanel } from './admin/AdminPanel';

const App: React.FC = React.memo(() => {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/admin');
    }
    return false;
  });

  useEffect(() => {
    const checkRoute = () => {
      setIsAdmin(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  if (isAdmin) {
    return <AdminPanel />;
  }

  return (
    <AuthProvider>
      <OnboardingFlow />
    </AuthProvider>
  );
});

App.displayName = 'App';

export default App;