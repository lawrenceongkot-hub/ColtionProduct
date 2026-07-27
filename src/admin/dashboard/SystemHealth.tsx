import React from 'react';
import type { SystemHealthStatus } from '../services/dashboardService';

interface SystemHealthProps {
  health: SystemHealthStatus;
}

const services: { key: keyof SystemHealthStatus; label: string }[] = [
  { key: 'api', label: 'API Status' },
  { key: 'database', label: 'Database Status' },
  { key: 'queue', label: 'Queue Status' },
  { key: 'wallet', label: 'Wallet Service' },
  { key: 'backgroundJobs', label: 'Background Jobs' },
];

export const SystemHealth: React.FC<SystemHealthProps> = React.memo(({ health }) => {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '14px' }}>
        System Health
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {services.map(({ key, label }) => {
          const ok = health[key];
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: ok ? '#10B981' : '#EF4444',
                  boxShadow: ok ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
                  animation: ok ? 'pulse 2s infinite' : 'none',
                }} />
                <span style={{ fontSize: '12px', color: '#D1D5DB', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                  {label}
                </span>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                color: ok ? '#10B981' : '#EF4444',
                padding: '2px 8px', borderRadius: '4px',
                background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              }}>
                {ok ? 'Online' : 'Offline'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

SystemHealth.displayName = 'SystemHealth';