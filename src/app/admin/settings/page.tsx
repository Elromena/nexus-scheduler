'use client';

import { useState, useEffect } from 'react';

// Debug Section Component
function DebugSection() {
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<{
    summary: {
      testMode: boolean;
      envTestMode: boolean;
      dbTestMode: boolean;
      hubspotConfigured: boolean;
      googleConfigured: boolean;
      debugLogging: boolean;
    };
    recentBookings: Array<{
      id: string;
      email: string;
      createdAt: string;
      hubspotContactId: string | null;
      hubspotDealId: string | null;
      googleEventId: string | null;
      googleMeetLink: string | null;
      status: string;
    }>;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }> | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/debug', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setDebugData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch debug data:', err);
    } finally {
      setLoading(false);
    }
  };

  const testIntegrations = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/debug', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType: 'all' }),
      });
      if (response.ok) {
        const result = await response.json();
        setTestResults(result.results);
      }
    } catch (err) {
      console.error('Failed to test integrations:', err);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Debug & Diagnostics</h2>
        <div className="flex gap-2">
          <button onClick={fetchDebugData} className="btn-outline text-sm" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={testIntegrations} className="btn-primary text-sm" disabled={testing}>
            {testing ? 'Testing...' : 'Test Integrations'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-4 space-y-2">
          {Object.entries(testResults).map(([key, result]) => (
            <div 
              key={key}
              className={`p-3 rounded-lg text-sm ${
                result.success 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              <strong className="capitalize">{key}:</strong> {result.message}
            </div>
          ))}
        </div>
      )}

      {/* Configuration Summary */}
      {debugData?.summary && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-600 uppercase mb-3">Configuration Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={`p-3 rounded-lg text-sm ${debugData.summary.testMode ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="font-medium">Test Mode</div>
              <div className={debugData.summary.testMode ? 'text-amber-700' : 'text-green-700'}>
                {debugData.summary.testMode ? 'ON (integrations disabled)' : 'OFF (live)'}
              </div>
            </div>
            <div className={`p-3 rounded-lg text-sm ${debugData.summary.hubspotConfigured ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">HubSpot</div>
              <div className={debugData.summary.hubspotConfigured ? 'text-green-700' : 'text-red-700'}>
                {debugData.summary.hubspotConfigured ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <div className={`p-3 rounded-lg text-sm ${debugData.summary.googleConfigured ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">Google Calendar</div>
              <div className={debugData.summary.googleConfigured ? 'text-green-700' : 'text-red-700'}>
                {debugData.summary.googleConfigured ? 'Configured' : 'Not configured'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {debugData?.recentBookings && debugData.recentBookings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 uppercase mb-3">Recent Bookings (Integration Status)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">HubSpot</th>
                  <th className="text-left px-3 py-2">Google Meet</th>
                  <th className="text-left px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debugData.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-3 py-2">{booking.email}</td>
                    <td className="px-3 py-2">
                      {booking.hubspotContactId ? (
                        booking.hubspotContactId.startsWith('test-') ? (
                          <span className="text-amber-600">Test ID</span>
                        ) : (
                          <span className="text-green-600" title={booking.hubspotContactId}>Connected</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {booking.googleMeetLink ? (
                        <a href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                          Link
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(booking.createdAt || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <strong>Note:</strong> For full runtime logs, go to Webflow Cloud Dashboard → Runtime logs. 
        Make sure <code className="bg-blue-100 px-1 rounded">DEBUG_LOGGING=true</code> is set in environment variables.
      </div>
    </div>
  );
}

export default function SettingsPage() {
  // Integration status
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{
    testMode: boolean;
    hubspotConfigured: boolean;
    googleServiceAccountConfigured: boolean;
    googleCalendarEmailConfigured: boolean;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  // DB Settings
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [calendarSlots, setCalendarSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        throw new Error('Failed to fetch settings');
      }

      const result = await response.json();
      const data = result.data || {};
      
      setTestMode(data.test_mode === 'true');
      
      // Parse calendar slots
      try {
        const slots = JSON.parse(data.calendar_slots || '[]');
        setCalendarSlots(Array.isArray(slots) ? slots : []);
      } catch {
        setCalendarSlots([]);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_mode: testMode ? 'true' : 'false',
          calendar_slots: JSON.stringify(calendarSlots),
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSettingsMessage({ type: 'success', text: 'Settings saved!' });
    } catch (err) {
      setSettingsMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSavingSettings(false);
    }
  };

  const addSlot = () => {
    if (newSlot && !calendarSlots.includes(newSlot)) {
      const updated = [...calendarSlots, newSlot].sort();
      setCalendarSlots(updated);
      setNewSlot('');
    }
  };

  const removeSlot = (slot: string) => {
    setCalendarSlots(calendarSlots.filter(s => s !== slot));
  };

  const handleVerify = async () => {
    setChecking(true);
    setStatusError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        throw new Error('Failed to check status');
      }

      const result = await response.json();
      setStatus(result.data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: 'RESET_ALL_DATA' }),
      });

      if (!response.ok) throw new Error('Failed to reset database');

      setResetMessage({ type: 'success', text: 'Database has been reset successfully!' });
      setShowResetConfirm(false);
    } catch (err) {
      setResetMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* App Settings (from DB) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">App Settings</h2>
          <button 
            onClick={saveSettings} 
            disabled={savingSettings || loadingSettings}
            className="btn-primary"
          >
            {savingSettings ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {settingsMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            settingsMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {settingsMessage.text}
          </div>
        )}

        {loadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner border-primary-600 border-t-transparent w-6 h-6"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900">Test Mode</div>
                <p className="text-sm text-slate-600 mt-1">
                  When enabled, bookings skip HubSpot and Google Calendar integrations. 
                  Use this for testing the scheduler without creating real records.
                </p>
              </div>
              <button
                onClick={() => setTestMode(!testMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  testMode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    testMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Calendar Slots */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="font-semibold text-slate-900 mb-2">Available Time Slots</div>
              <p className="text-sm text-slate-600 mb-4">
                Configure which time slots are available for booking (24-hour format, e.g., 09:00, 14:30)
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {calendarSlots.length === 0 ? (
                  <span className="text-sm text-slate-500">No slots configured</span>
                ) : (
                  calendarSlots.map((slot) => (
                    <span 
                      key={slot} 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm"
                    >
                      {slot}
                      <button 
                        onClick={() => removeSlot(slot)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="form-input w-auto"
                />
                <button onClick={addSlot} className="btn-outline">
                  Add Slot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Integration Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Integration Status</h2>
          <button onClick={handleVerify} className="btn-outline" disabled={checking}>
            {checking ? 'Checking...' : 'Verify Integrations'}
          </button>
        </div>

        {statusError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {statusError}
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="font-semibold">HubSpot</div>
              <div className={`flex items-center gap-2 ${status.hubspotConfigured ? 'text-green-700' : 'text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${status.hubspotConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {status.hubspotConfigured ? 'Connected' : 'Not configured'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="font-semibold">Google Service Account</div>
              <div className={`flex items-center gap-2 ${status.googleServiceAccountConfigured ? 'text-green-700' : 'text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${status.googleServiceAccountConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {status.googleServiceAccountConfigured ? 'Connected' : 'Not configured'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="font-semibold">Google Calendar</div>
              <div className={`flex items-center gap-2 ${status.googleCalendarEmailConfigured ? 'text-green-700' : 'text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${status.googleCalendarEmailConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {status.googleCalendarEmailConfigured ? 'Connected' : 'Not configured'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="font-semibold">Test Mode</div>
              <div className={`flex items-center gap-2 ${status.testMode ? 'text-amber-700' : 'text-green-700'}`}>
                <span className={`w-2 h-2 rounded-full ${status.testMode ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                {status.testMode ? 'Enabled' : 'Disabled (Live)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Environment Variables</h2>
        <p className="text-slate-600 mb-4 text-sm">
          These are configured in your <strong>Webflow Cloud dashboard</strong> → Environment Variables. 
          They cannot be changed from here for security reasons.
        </p>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <code className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">ADMIN_PASSWORD</code>
            <span className="text-slate-600">Password for this admin dashboard</span>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <code className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">HUBSPOT_ACCESS_TOKEN</code>
            <span className="text-slate-600">HubSpot private app token</span>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <code className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">GOOGLE_SERVICE_ACCOUNT</code>
            <span className="text-slate-600">Google credentials JSON (stringified)</span>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <code className="font-mono bg-slate-200 px-2 py-0.5 rounded text-xs">GOOGLE_CALENDAR_EMAIL</code>
            <span className="text-slate-600">Calendar email for events</span>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Setup Instructions</h2>
        
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-semibold text-blue-900 mb-2">Webflow Site Custom Code</div>
            <p className="text-blue-800 mb-3">
              Add this script to your Webflow site's <strong>Footer Code</strong> (Site Settings → Custom Code → Footer Code).
              This handles both the tracker and the scheduler modal.
            </p>
            <details className="cursor-pointer">
              <summary className="text-blue-700 font-medium">View full script</summary>
              <pre className="mt-2 bg-slate-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`<script>
(function () {
  const host = window.location.hostname;
  const isStaging = host.includes('webflow.io');
  const schedulerBase = isStaging
    ? 'https://your-staging-domain.webflow.io'
    : 'https://www.yourdomain.com';

  // Load tracker
  const s = document.createElement('script');
  s.src = \`\${schedulerBase}/scheduler/tracker.js\`;
  s.defer = true;
  document.head.appendChild(s);

  // Modal trigger - add class "nexus-trigger-btn" to any button
  document.querySelectorAll('.nexus-trigger-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      // Opens scheduler in modal...
    });
  });
})();
</script>`}
              </pre>
            </details>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="font-semibold text-slate-900 mb-2">Trigger Button</div>
            <p className="text-slate-600 mb-2">
              Add this class to any Webflow button or link to open the scheduler modal:
            </p>
            <code className="bg-slate-900 text-green-400 px-3 py-1 rounded text-sm">nexus-trigger-btn</code>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="font-semibold text-slate-900 mb-2">Direct Link</div>
            <p className="text-slate-600 mb-2">
              Or link directly to the standalone scheduler page:
            </p>
            <code className="bg-slate-900 text-green-400 px-3 py-1 rounded text-sm">https://yourdomain.com/scheduler</code>
          </div>
        </div>
      </div>

      {/* Debug & Diagnostics */}
      <DebugSection />

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h2>
        
        {resetMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            resetMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {resetMessage.text}
          </div>
        )}

        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Reset Database</div>
              <p className="text-sm text-slate-600 mt-1">
                Delete all visitors, sessions, page views, form events, and bookings. This cannot be undone.
              </p>
            </div>
            {!showResetConfirm ? (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-2 text-slate-600 text-sm"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReset}
                  disabled={resetting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Yes, Delete All Data'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
