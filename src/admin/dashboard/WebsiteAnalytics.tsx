import React from 'react';
import type { WebsiteAnalytics as Analytics } from '../services/dashboardService';

interface WebsiteAnalyticsProps {
  analytics: Analytics;
}

export const WebsiteAnalytics: React.FC<WebsiteAnalyticsProps> = React.memo(({ analytics }) => {
  return (
    <div style={{
      background: 'rgba(17,24,39,0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '14px' }}>
        Website Analytics
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Period selector mock */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['Today', 'Weekly', 'Monthly'].map((period, i) => (
            <div key={period} style={{
              flex: 1, padding: '10px', borderRadius: '10px',
              background: i === 0 ? 'rgba(0,102,255,0.12)' : 'rgba(255,255,255,0.03)',
              border: i === 0 ? '1px solid rgba(0,102,255,0.2)' : '1px solid transparent',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '9px', color: i === 0 ? '#0066FF' : 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 600, marginBottom: '4px' }}>
                {period}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                {i === 0 ? analytics.today.visitors : i === 1 ? analytics.weekly.visitors : analytics.monthly.visitors}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                Visitors
              </div>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { label: 'Registrations', value: analytics.today.registrations },
            { label: 'Deposits', value: analytics.today.deposits },
            { label: 'Withdrawals', value: analytics.today.withdrawals },
            { label: 'VIP Purchases', value: analytics.today.vipPurchases },
          ].map((item) => (
            <div key={item.label} style={{
              padding: '8px 10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Growth */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            flex: 1, padding: '8px', borderRadius: '8px',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '9px', color: 'rgba(16,185,129,0.7)', fontFamily: "'Inter', sans-serif" }}>Weekly Growth</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981', fontFamily: "'Inter', sans-serif" }}>+{analytics.weekly.growth}%</div>
          </div>
          <div style={{
            flex: 1, padding: '8px', borderRadius: '8px',
            background: 'rgba(0,102,255,0.06)', border: '1px solid rgba(0,102,255,0.12)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '9px', color: 'rgba(0,102,255,0.7)', fontFamily: "'Inter', sans-serif" }}>Monthly Growth</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0066FF', fontFamily: "'Inter', sans-serif" }}>+{analytics.monthly.growth}%</div>
          </div>
        </div>
      </div>
    </div>
  );
});

WebsiteAnalytics.displayName = 'WebsiteAnalytics';