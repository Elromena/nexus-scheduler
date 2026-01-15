'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  overview: {
    visitors: number;
    sessions: number;
    pageViews: number;
    formOpens: number;
    bookings: number;
    conversionRate: number;
  };
  trafficSources: Array<{ source: string | null; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topLandingPages: Array<{ page: string; count: number }>;
  deviceBreakdown: Array<{ device: string | null; count: number }>;
  countryBreakdown: Array<{ country: string | null; count: number }>;
  funnelSteps: Array<{ step: number; eventType: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
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
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
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

  // Calculate funnel percentages
  const funnelData = {
    visitors: data?.overview.visitors || 0,
    formOpens: data?.overview.formOpens || 0,
    step1: data?.funnelSteps.find(f => f.step === 1 && f.eventType === 'step_completed')?.count || 0,
    step2: data?.funnelSteps.find(f => f.step === 2 && f.eventType === 'step_completed')?.count || 0,
    bookings: data?.overview.bookings || 0,
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
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

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Conversion Funnel</h2>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Visitors', value: funnelData.visitors, color: 'bg-slate-200' },
            { label: 'Form Opens', value: funnelData.formOpens, color: 'bg-blue-200' },
            { label: 'Step 1 Complete', value: funnelData.step1, color: 'bg-blue-300' },
            { label: 'Step 2 Complete', value: funnelData.step2, color: 'bg-blue-400' },
            { label: 'Booked', value: funnelData.bookings, color: 'bg-green-500' },
          ].map((step, index) => (
            <div key={step.label} className="text-center">
              <div className={`h-24 ${step.color} rounded-lg flex items-end justify-center mb-2`}>
                <div 
                  className="bg-primary-600 rounded-b-lg w-full transition-all"
                  style={{ 
                    height: `${getPercentage(step.value, funnelData.visitors)}%`,
                    minHeight: step.value > 0 ? '8px' : '0'
                  }}
                />
              </div>
              <div className="text-2xl font-bold text-slate-900">{step.value}</div>
              <div className="text-xs text-slate-500">{step.label}</div>
              {index > 0 && (
                <div className="text-xs text-slate-400 mt-1">
                  {getPercentage(step.value, funnelData.visitors)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Three column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Traffic Sources */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Traffic Sources</h3>
          {data?.trafficSources && data.trafficSources.length > 0 ? (
            <div className="space-y-3">
              {data.trafficSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{source.source || 'Direct'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full"
                        style={{ 
                          width: `${getPercentage(source.count, data.overview.visitors)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">
                      {source.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet</p>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Devices</h3>
          {data?.deviceBreakdown && data.deviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.deviceBreakdown.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 capitalize">{device.device || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ 
                          width: `${getPercentage(device.count, data.overview.visitors)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">
                      {device.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet</p>
          )}
        </div>

        {/* Countries */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Countries</h3>
          {data?.countryBreakdown && data.countryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.countryBreakdown.slice(0, 5).map((country, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{country.country || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ 
                          width: `${getPercentage(country.count, data.overview.visitors)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">
                      {country.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Landing Pages & Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Landing Pages */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Landing Pages</h3>
          {data?.topLandingPages && data.topLandingPages.length > 0 ? (
            <div className="space-y-3">
              {data.topLandingPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate max-w-[200px]" title={page.page}>
                    {page.page?.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{page.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet</p>
          )}
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Referrers</h3>
          {data?.topReferrers && data.topReferrers.length > 0 ? (
            <div className="space-y-3">
              {data.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate max-w-[200px]" title={referrer.referrer}>
                    {referrer.referrer?.replace(/^https?:\/\//, '').split('/')[0] || 'Direct'}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{referrer.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
