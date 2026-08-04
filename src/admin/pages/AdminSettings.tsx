import React, { useState, useEffect } from 'react';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService';
import type { PlatformSettings } from '../services/settingsService';

// ==================== STATIC HELPER COMPONENTS (defined OUTSIDE) ====================

const COUNTRIES = [
  { code: 'PH', name: 'Philippines' }, { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' }, { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' }, { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' }, { code: 'VN', name: 'Vietnam' },
  { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' }, { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
];

// These MUST be outside the main component to prevent React remounting on every render
const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '18px' }}>{icon}</span> {title}
    </h3>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void; desc?: string }> = ({ label, value, onChange, desc }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <div>
      <div style={{ fontSize: '13px', color: '#E5E7EB', fontWeight: 500 }}>{label}</div>
      {desc && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{desc}</div>}
    </div>
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: value ? '#10B981' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s ease' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#FFFFFF', position: 'absolute', top: '3px', left: value ? '23px' : '3px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  </div>
);

const InputField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean }> = ({ label, value, onChange, type = 'text', placeholder, multiline }) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'vertical', minHeight: '60px' }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
    )}
  </div>
);

// ==================== MAIN COMPONENT ====================

export const AdminSettings: React.FC = React.memo(() => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newWhitelistIp, setNewWhitelistIp] = useState('');
  const [newWhitelistDesc, setNewWhitelistDesc] = useState('');
  const [newBlacklistIp, setNewBlacklistIp] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');

  // Load settings from backend on mount
  useEffect(() => {
    settingsService.getSettings().then(s => setSettings(s));
  }, []);

  const updateField = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    const result = await settingsService.saveSettings(settings);
    setSaving(false);
    if (result.success) setSuccessMsg('Settings saved successfully');
    else setErrorMsg(result.error || 'Failed to save settings');
  };

  const addWhitelist = () => {
    if (!newWhitelistIp.trim()) return;
    const updated = [...settings.ipWhitelist, { ip: newWhitelistIp.trim(), description: newWhitelistDesc.trim(), createdAt: new Date().toISOString(), enabled: true }];
    setSettings(prev => ({ ...prev, ipWhitelist: updated }));
    setNewWhitelistIp(''); setNewWhitelistDesc('');
  };

  const addBlacklist = () => {
    if (!newBlacklistIp.trim()) return;
    const updated = [...settings.ipBlacklist, { ip: newBlacklistIp.trim(), reason: newBlacklistReason.trim(), blockedAt: new Date().toISOString(), enabled: true }];
    setSettings(prev => ({ ...prev, ipBlacklist: updated }));
    setNewBlacklistIp(''); setNewBlacklistReason('');
  };

  return (
    <div style={{ padding: '20px 24px', fontFamily: "'Inter', sans-serif", maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>Website Control</h1>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: '8px', background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.25)', color: '#0066FF', fontSize: '13px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {successMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: '12px', marginBottom: '16px' }}>✅ {successMsg}</div>}
      {errorMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', marginBottom: '16px' }}>❌ {errorMsg}</div>}

      <Section title="Website Information" icon="🌐">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <InputField label="Website Name" value={settings.websiteName} onChange={v => updateField('websiteName', v)} />
          <InputField label="Support Email" value={settings.supportEmail} onChange={v => updateField('supportEmail', v)} />
          <InputField label="Support Phone" value={settings.supportPhone} onChange={v => updateField('supportPhone', v)} />
          <InputField label="Footer Copyright" value={settings.footerCopyright} onChange={v => updateField('footerCopyright', v)} />
        </div>
        <InputField label="Company Address" value={settings.companyAddress} onChange={v => updateField('companyAddress', v)} />
        <InputField label="Website Description" value={settings.websiteDescription} onChange={v => updateField('websiteDescription', v)} multiline />
      </Section>

      <Section title="Maintenance Mode" icon="🔧">
        <Toggle label="Enable Maintenance Mode" value={settings.maintenanceMode} onChange={v => updateField('maintenanceMode', v)}
          desc="When enabled, only administrators can access the website. Users will see a maintenance message." />
        {settings.maintenanceMode && <InputField label="Maintenance Message" value={settings.maintenanceMessage} onChange={v => updateField('maintenanceMessage', v)} multiline />}
      </Section>

      <Section title="Landing Statistics" icon="📊">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <InputField label="Total Users Display" value={String(settings.landingTotalUsersDisplay || '')} onChange={v => updateField('landingTotalUsersDisplay', parseFloat(v) || 0)} placeholder="0 = use actual count" />
          <InputField label="Total Investments Display" value={String(settings.landingTotalInvestmentsDisplay || '')} onChange={v => updateField('landingTotalInvestmentsDisplay', parseFloat(v) || 0)} placeholder="0 = use actual total" />
          <InputField label="Active Investors Display" value={String(settings.landingActiveInvestorsDisplay || '')} onChange={v => updateField('landingActiveInvestorsDisplay', parseInt(v) || 0)} placeholder="0 = use actual count" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <Toggle label="Enable Latest Investors" value={settings.landingEnableLatestInvestors ?? true} onChange={v => updateField('landingEnableLatestInvestors', v)}
            desc="When ON, the Latest Investors section is shown on the landing page" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <Toggle label="Enable Top Investors" value={settings.landingEnableTopInvestors ?? true} onChange={v => updateField('landingEnableTopInvestors', v)}
            desc="When ON, the Top Investors section is shown on the landing page" />
        </div>
        <Toggle label="Enable Animated Numbers" value={settings.landingEnableAnimatedNumbers ?? true} onChange={v => updateField('landingEnableAnimatedNumbers', v)}
          desc="When enabled, numbers animate on the landing page" />
        <Toggle label="Enable Live Counter" value={settings.landingEnableLiveCounter ?? true} onChange={v => updateField('landingEnableLiveCounter', v)}
          desc="When enabled, the landing page fetches live statistics from the backend" />
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
          Set display values to 0 to show actual live values from the database.
        </p>
      </Section>

      <Section title="Referral Bonus Settings" icon="🤝">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Referral Commission Percentage</div>
            <input type="number" min="0" max="100" value={settings.referralCommissionPercent} onChange={e => updateField('referralCommissionPercent', parseInt(e.target.value) || 0)}
              style={{ width: '120px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>%</span>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Only future referral commissions will use this percentage. Existing commissions remain unchanged.</p>
      </Section>

      <Section title="Payment Method Control" icon="💳">
        {Object.entries(settings.paymentMethods).map(([method, enabled]) => (
          <Toggle key={method} label={method} value={Boolean(enabled)} onChange={v => updateField('paymentMethods', { ...settings.paymentMethods, [method]: v })}
            desc={Boolean(enabled) ? 'Users can see and use this method' : 'Hidden from users'} />
        ))}
      </Section>

      <Section title="Withdrawal Maintenance" icon="💸">
        <Toggle label="Enable Withdrawals" value={settings.withdrawalsEnabled} onChange={v => updateField('withdrawalsEnabled', v)}
          desc={settings.withdrawalsEnabled ? 'Users can submit withdrawal requests' : 'Users cannot submit new withdrawal requests. Admins can still process pending.'} />
        {!settings.withdrawalsEnabled && <InputField label="Withdrawal Maintenance Message" value={settings.withdrawalMaintenanceMessage} onChange={v => updateField('withdrawalMaintenanceMessage', v)} multiline />}
      </Section>

      <Section title="Registration & Login Control" icon="🔐">
        <Toggle label="Enable Registration" value={settings.registrationEnabled} onChange={v => updateField('registrationEnabled', v)} desc={settings.registrationEnabled ? 'New users can register' : 'New registrations are disabled'} />
        <Toggle label="Enable Login" value={settings.loginEnabled} onChange={v => updateField('loginEnabled', v)} desc={settings.loginEnabled ? 'Users can log in' : 'Login is temporarily unavailable. Admin login always works.'} />
      </Section>

      <Section title="Login Attempt Limit" icon="🛡️">
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Max Login Attempts</div>
            <select value={settings.maxLoginAttempts} onChange={e => updateField('maxLoginAttempts', parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
              {[3, 5, 10].map(n => <option key={n} value={n}>{n} attempts</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Lock Duration</div>
            <select value={settings.lockDurationMinutes} onChange={e => updateField('lockDurationMinutes', parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D5DB', fontSize: '12px', fontFamily: "'Inter', sans-serif", cursor: 'pointer', outline: 'none' }}>
              {[5, 10, 30, 60].map(n => <option key={n} value={n}>{n} minutes</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="IP Whitelist" icon="✅">
        <Toggle label="Enable IP Whitelist" value={settings.ipWhitelistEnabled} onChange={v => updateField('ipWhitelistEnabled', v)} desc="When enabled, only whitelisted IPs can access the Admin Panel" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input value={newWhitelistIp} onChange={e => setNewWhitelistIp(e.target.value)} placeholder="IP Address" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          <input value={newWhitelistDesc} onChange={e => setNewWhitelistDesc(e.target.value)} placeholder="Description" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          <button type="button" onClick={addWhitelist} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.2)', color: '#0066FF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
        </div>
        {settings.ipWhitelist.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginTop: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
            <div><span style={{ color: '#D1D5DB', fontFamily: 'monospace', fontSize: '12px' }}>{item.ip}</span> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{item.description}</span></div>
            <button type="button" onClick={() => { const updated = settings.ipWhitelist.filter((_, idx) => idx !== i); setSettings(prev => ({ ...prev, ipWhitelist: updated })); }} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
          </div>
        ))}
      </Section>

      <Section title="IP Blacklist" icon="🚫">
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input value={newBlacklistIp} onChange={e => setNewBlacklistIp(e.target.value)} placeholder="IP Address" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          <input value={newBlacklistReason} onChange={e => setNewBlacklistReason(e.target.value)} placeholder="Reason" style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          <button type="button" onClick={addBlacklist} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Block</button>
        </div>
        {settings.ipBlacklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginTop: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
            <div><span style={{ color: '#D1D5DB', fontFamily: 'monospace', fontSize: '12px' }}>{item.ip}</span> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{item.reason}</span></div>
            <button type="button" onClick={() => { const updated = settings.ipBlacklist.filter((_, idx) => idx !== i); setSettings(prev => ({ ...prev, ipBlacklist: updated })); }} style={{ color: '#EF4444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>×</button>
          </div>
        ))}
      </Section>

      <Section title="Country Restrictions" icon="🌍">
        <InputField label="Blocked Country Message" value={settings.blockedCountryMessage} onChange={v => updateField('blockedCountryMessage', v)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '12px' }}>
          {COUNTRIES.map(c => (
            <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '12px', color: '#D1D5DB', flex: 1 }}>{c.name}</span>
              <button type="button" onClick={() => updateField('countryRestrictions', { ...(settings.countryRestrictions || {}), [c.code]: (settings.countryRestrictions || {})[c.code] !== false })}
                style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: (settings.countryRestrictions || {})[c.code] !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: (settings.countryRestrictions || {})[c.code] !== false ? '#10B981' : '#EF4444', border: 'none' }}>
                {(settings.countryRestrictions || {})[c.code] !== false ? 'Allowed' : 'Blocked'}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Security Settings" icon="🔒">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Session Timeout (minutes)</div>
            <input type="number" value={settings.sessionTimeoutMinutes} onChange={e => updateField('sessionTimeoutMinutes', parseInt(e.target.value) || 60)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Password Min Length</div>
            <input type="number" value={settings.passwordMinLength} onChange={e => updateField('passwordMinLength', parseInt(e.target.value) || 8)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          </div>
        </div>
        <Toggle label="Require Uppercase" value={settings.requireUppercase} onChange={v => updateField('requireUppercase', v)} />
        <Toggle label="Require Lowercase" value={settings.requireLowercase} onChange={v => updateField('requireLowercase', v)} />
        <Toggle label="Require Number" value={settings.requireNumber} onChange={v => updateField('requireNumber', v)} />
        <Toggle label="Require Special Character" value={settings.requireSpecialChar} onChange={v => updateField('requireSpecialChar', v)} />
        <Toggle label="Enable Two-Factor Authentication" value={settings.twoFactorEnabled} onChange={v => updateField('twoFactorEnabled', v)} />
        <Toggle label="Email Verification Required" value={settings.emailVerificationRequired} onChange={v => updateField('emailVerificationRequired', v)} />
        <Toggle label="Mobile Verification Required" value={settings.mobileVerificationRequired} onChange={v => updateField('mobileVerificationRequired', v)} />
      </Section>

      <Section title="File Upload Settings" icon="📁">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Max Upload Size (MB)</div>
            <input type="number" value={settings.maxUploadSizeMB} onChange={e => updateField('maxUploadSizeMB', parseInt(e.target.value) || 10)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '4px' }}>Max Verification File Size (MB)</div>
            <input type="number" value={settings.maxVerificationFileSizeMB} onChange={e => updateField('maxVerificationFileSizeMB', parseInt(e.target.value) || 5)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12px', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
          </div>
        </div>
        <InputField label="Allowed Image Types (comma separated)" value={settings.allowedImageTypes} onChange={v => updateField('allowedImageTypes', v)} />
        <InputField label="Allowed Document Types (comma separated)" value={settings.allowedDocumentTypes} onChange={v => updateField('allowedDocumentTypes', v)} />
      </Section>

      <Section title="Notification Settings" icon="🔔">
        <Toggle label="Email Notifications" value={settings.emailNotifications} onChange={v => updateField('emailNotifications', v)} />
        <Toggle label="SMS Notifications" value={settings.smsNotifications} onChange={v => updateField('smsNotifications', v)} />
        <Toggle label="In-App Notifications" value={settings.inAppNotifications} onChange={v => updateField('inAppNotifications', v)} />
        <Toggle label="Admin Notifications" value={settings.adminNotifications} onChange={v => updateField('adminNotifications', v)} />
        <Toggle label="Referral Notifications" value={settings.referralNotifications} onChange={v => updateField('referralNotifications', v)} />
        <Toggle label="Investment Notifications" value={settings.investmentNotifications} onChange={v => updateField('investmentNotifications', v)} />
        <Toggle label="Deposit Notifications" value={settings.depositNotifications} onChange={v => updateField('depositNotifications', v)} />
        <Toggle label="Withdrawal Notifications" value={settings.withdrawalNotifications} onChange={v => updateField('withdrawalNotifications', v)} />
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding: '12px 32px', borderRadius: '10px', background: 'linear-gradient(135deg, #0066FF, #0052CC)', border: 'none', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: saving ? 0.5 : 1, boxShadow: '0 4px 16px rgba(0,102,255,0.3)' }}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
});

AdminSettings.displayName = 'AdminSettings';