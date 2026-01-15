'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{
    testMode: boolean;
    hubspotConfigured: boolean;
    googleServiceAccountConfigured: boolean;
    googleCalendarEmailConfigured: boolean;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleVerify = async () => {
    setChecking(true);
    setStatusError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

      {/* Environment Variables Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Environment Variables</h2>
        <p className="text-slate-600 mb-4">
          Configure these environment variables in your Webflow Cloud dashboard:
        </p>
        
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">HUBSPOT_ACCESS_TOKEN</code>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
            </div>
            <p className="text-sm text-slate-600">Your HubSpot private app access token</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">GOOGLE_SERVICE_ACCOUNT</code>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
            </div>
            <p className="text-sm text-slate-600">Google service account JSON credentials (stringified)</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">GOOGLE_CALENDAR_EMAIL</code>
            </div>
            <p className="text-sm text-slate-600">Email of the calendar to create events on</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">ADMIN_PASSWORD</code>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Secret</span>
            </div>
            <p className="text-sm text-slate-600">Password to access this admin dashboard</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">TEST_MODE</code>
            </div>
            <p className="text-sm text-slate-600">Set to "true" to enable test mode (skips HubSpot/Google integrations)</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <code className="text-sm font-mono bg-slate-200 px-2 py-1 rounded">DEBUG_LOGGING</code>
            </div>
            <p className="text-sm text-slate-600">Set to "true" to log tracking payloads in runtime logs for debugging</p>
          </div>
        </div>
      </div>

      {/* Tracking Script */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tracking Script</h2>
        <p className="text-slate-600 mb-4">
          Add this script to your Webflow site's custom code (Site Settings → Custom Code → Head Code):
        </p>
        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          {`<script src="https://yourdomain.com/scheduler/tracker.js" defer></script>`}
        </div>
      </div>

      {/* Integration Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Verify Integrations</h2>
          <button onClick={handleVerify} className="btn-outline" disabled={checking}>
            {checking ? 'Checking...' : 'Verify integrations'}
          </button>
        </div>

        {statusError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {statusError}
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="font-semibold">HubSpot</div>
              <div className={status.hubspotConfigured ? 'text-green-700' : 'text-red-700'}>
                {status.hubspotConfigured ? 'Configured' : 'Missing token'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="font-semibold">Google Service Account</div>
              <div className={status.googleServiceAccountConfigured ? 'text-green-700' : 'text-red-700'}>
                {status.googleServiceAccountConfigured ? 'Configured' : 'Missing credentials'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="font-semibold">Google Calendar Email</div>
              <div className={status.googleCalendarEmailConfigured ? 'text-green-700' : 'text-red-700'}>
                {status.googleCalendarEmailConfigured ? 'Configured' : 'Missing email'}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="font-semibold">Test Mode</div>
              <div className={status.testMode ? 'text-amber-700' : 'text-green-700'}>
                {status.testMode ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scheduler Trigger */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Scheduler Trigger</h2>
        <p className="text-slate-600 mb-4">
          Add this class to any button/link to open the scheduler:
        </p>
        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
          nexus-trigger-btn
        </div>
        
        <p className="text-slate-600 mb-4">
          Or link directly to the scheduler:
        </p>
        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          https://yourdomain.com/scheduler
        </div>
      </div>

    </div>
  );
}
