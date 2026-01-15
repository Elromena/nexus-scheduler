'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [testMode, setTestMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Settings are managed via environment variables in Webflow Cloud
    // This page is mainly for documentation
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      {saved && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Settings saved!
        </div>
      )}
    </div>
  );
}
