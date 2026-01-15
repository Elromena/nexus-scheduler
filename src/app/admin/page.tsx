'use client';

import { useState, useEffect } from 'react';

interface OverviewData {
  visitors: number;
  sessions: number;
  pageViews: number;
  formOpens: number;
  bookings: number;
  conversionRate: number;
}

interface DashboardData {
  overview: OverviewData;
  trafficSources: Array<{ source: string | null; count: number }>;
  recentVisitors: Array<{
    id: string;
    country: string | null;
    deviceType: string | null;
    lastSeenAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchDashboard();
  }, [days]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/scheduler/api/analytics?days=${days}`, {
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
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="form-select w-auto"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value">{data?.overview.visitors || 0}</div>
          <div className="stat-label">Visitors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.overview.sessions || 0}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.overview.pageViews || 0}</div>
          <div className="stat-label">Page Views</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.overview.formOpens || 0}</div>
          <div className="stat-label">Form Opens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.overview.bookings || 0}</div>
          <div className="stat-label">Bookings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-primary-600">
            {data?.overview.conversionRate || 0}%
          </div>
          <div className="stat-label">Conversion Rate</div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic sources */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Traffic Sources</h2>
          {data?.trafficSources && data.trafficSources.length > 0 ? (
            <div className="space-y-3">
              {data.trafficSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-700">{source.source || 'Direct'}</span>
                  <span className="font-semibold text-slate-900">{source.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No traffic data yet</p>
          )}
        </div>

        {/* Recent visitors */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Visitors</h2>
          {data?.recentVisitors && data.recentVisitors.length > 0 ? (
            <div className="space-y-3">
              {data.recentVisitors.slice(0, 5).map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-700">{visitor.country || 'Unknown'}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="text-slate-500">{visitor.deviceType || 'Unknown'}</span>
                  </div>
                  <span className="text-slate-400">
                    {new Date(visitor.lastSeenAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No visitors yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
