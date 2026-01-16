'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface OverviewData {
  visitors: number;
  sessions: number;
  pageViews: number;
  formOpens: number;
  bookings: number;
  conversionRate: number;
}

interface ActivityEvent {
  id: string;
  visitorId: string;
  eventType: string;
  timestamp: string;
  metadata: string | null;
}

interface PipelineStage {
  stage: string | null;
  count: number;
}

interface HotLead {
  id: string;
  country: string | null;
  totalVisits: number;
  lastSeenAt: string;
}

interface DashboardData {
  overview: OverviewData;
  recentActivity: ActivityEvent[];
  pipeline: PipelineStage[];
  hotLeads: HotLead[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      
      // Trigger HubSpot sync in the background
      fetch('/scheduler/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Silent sync error:', err));

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
  }, [days]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'form_submitted': return '✅';
      case 'form_opened': return '🚀';
      case 'step_started': return '📝';
      case 'step_completed': return '👉';
      default: return '⚡';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Live overview of your booking pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboard}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Visitors</div>
          <div className="text-2xl font-bold text-slate-900">{data?.overview.visitors.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Form Opens</div>
          <div className="text-2xl font-bold text-slate-900">{data?.overview.formOpens.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bookings</div>
          <div className="text-2xl font-bold text-primary-600">{data?.overview.bookings.toLocaleString()}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conv. Rate</div>
          <div className="text-2xl font-bold text-slate-900">{data?.overview.conversionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">HubSpot Sync</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></div>
            <div className="text-sm font-semibold text-slate-600">{loading ? 'Syncing...' : 'Up to date'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Live Pipeline & Hot Leads */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pipeline Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">HubSpot Deal Pipeline</h2>
              <Link href="/admin/reports/deal-stages" className="text-xs text-primary-600 font-semibold hover:underline">Full Report →</Link>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(data?.pipeline || []).length > 0 ? (
                data?.pipeline.map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-slate-400 truncate mb-1" title={p.stage || 'Unknown'}>
                      {p.stage || 'No Stage'}
                    </div>
                    <div className="text-xl font-bold text-slate-900">{p.count}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-sm text-slate-400">
                  Waiting for HubSpot data sync...
                </div>
              )}
            </div>
          </div>

          {/* Hot Leads */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">🔥 High-Intent Visitors</h2>
            </div>
            <div className="p-0">
              {data?.hotLeads && data.hotLeads.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {data.hotLeads.map((lead) => (
                    <Link 
                      key={lead.id} 
                      href={`/admin/leads?visitorId=${lead.id}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                          {lead.totalVisits}x
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Returning Visitor</div>
                          <div className="text-xs text-slate-500">{lead.country || 'Unknown'} • Seen {formatTimeAgo(lead.lastSeenAt)}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded uppercase tracking-tighter">Hot Lead</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  Collecting high-intent visitor data...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Activity Feed */}
        <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-5 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Activity
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((event) => (
                <div key={event.id} className="flex gap-3 animate-in slide-in-from-right-2 duration-300">
                  <div className="text-lg flex-shrink-0 mt-1">{getEventIcon(event.eventType)}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200">
                      {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{formatTimeAgo(event.timestamp)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[100px]">{event.visitorId.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs">
                Waiting for incoming traffic...
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-800/30 border-t border-slate-700 text-center">
            <Link href="/admin/analytics" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
              View All Analytics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
