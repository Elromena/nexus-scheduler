'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Log = {
  id: number;
  timestamp: string;
  provider: string;
  endpoint: string;
  method: string;
  status: number;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  duration: number | null;
};

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('hubspot');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/scheduler/api/admin/logs?provider=${activeTab}`);
      const text = await res.text();
      console.log('[Logs] Raw response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Invalid JSON response: ${text.substring(0, 100)}`);
        return;
      }
      
      if (!res.ok) {
        setError(`API error: ${res.status} - ${data.error || 'Unknown error'}`);
        return;
      }
      
      if (data.success) {
        console.log('[Logs] Received', data.logs?.length, 'logs');
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'hubspot', label: 'HubSpot' },
    { id: 'google_calendar', label: 'Google Calendar' },
    { id: 'resend', label: 'Email (Resend)' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/admin/settings" 
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Integration Logs</h1>
        </div>
        <p className="text-gray-500">
          View raw API requests and responses for debugging integrations.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex gap-6 h-[calc(100vh-250px)]">
        {/* List */}
        <div className="w-1/2 overflow-auto bg-white shadow rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading logs...</div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 font-medium mb-2">Error loading logs</div>
              <div className="text-red-500 text-sm">{error}</div>
              <button 
                onClick={fetchLogs}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No logs found for {tabs.find(t => t.id === activeTab)?.label}.
              <div className="text-xs mt-2 text-gray-400">
                Logs are recorded when API calls are made to integrations.
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method / Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedLog?.id === log.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.status && log.status >= 200 && log.status < 300 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'}`}>
                        {log.status || 'ERR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{log.method}</div>
                      <div className="text-gray-500 truncate max-w-[200px]" title={log.endpoint}>
                        {log.endpoint}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp + 'Z').toLocaleString()}
                      <div className="text-xs text-gray-400">{log.duration}ms</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail View */}
        <div className="w-1/2 bg-white shadow rounded-lg p-6 overflow-auto">
          {selectedLog ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Request Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500 block">Timestamp</span>
                    {new Date(selectedLog.timestamp + 'Z').toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500 block">Duration</span>
                    {selectedLog.duration}ms
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Endpoint</span>
                    <code className="text-xs bg-gray-100 p-1 rounded">{selectedLog.method} {selectedLog.endpoint}</code>
                  </div>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Request Body</h4>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 overflow-auto max-h-60">
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                    {formatJson(selectedLog.requestBody)}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Response Body</h4>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 overflow-auto max-h-96">
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                    {formatJson(selectedLog.responseBody)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a log entry to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatJson(str: string | null) {
  if (!str) return 'null';
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
