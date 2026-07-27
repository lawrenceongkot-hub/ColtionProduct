import React from 'react';

export const SkeletonLoader: React.FC = React.memo(() => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            background: 'rgba(26,34,53,0.6)', borderRadius: '16px', padding: '20px',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '14px' }} />
            <div style={{ width: '60%', height: '26px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }} />
            <div style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }} />
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{
          background: 'rgba(26,34,53,0.6)', borderRadius: '16px', padding: '20px', height: '280px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ width: '40%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
          <div style={{ width: '100%', height: '220px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
        </div>
        <div style={{
          background: 'rgba(26,34,53,0.6)', borderRadius: '16px', padding: '20px', height: '280px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ width: '40%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
          <div style={{ width: '100%', height: '220px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            background: 'rgba(26,34,53,0.6)', borderRadius: '16px', padding: '20px', height: '200px',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ width: '40%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />
            <div style={{ width: '100%', height: '140px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
          </div>
        ))}
      </div>
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';