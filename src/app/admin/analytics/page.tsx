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
    formConversionRate: number;
    newVisitors: number;
    returningVisitors: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPagesPerSession: number;
    avgTimeOnSite: number;
    avgScrollDepth: number;
  };
  traffic: {
    sources: Array<{ source: string | null; count: number }>;
    mediums: Array<{ medium: string | null; count: number }>;
    campaigns: Array<{ campaign: string | null; count: number }>;
    referrers: Array<{ referrer: string; count: number }>;
    landingPages: Array<{ page: string; count: number }>;
  };
  devices: {
    types: Array<{ device: string | null; count: number }>;
    browsers: Array<{ browser: string | null; count: number }>;
    operatingSystems: Array<{ os: string | null; count: number }>;
  };
  locations: {
    countries: Array<{ country: string | null; count: number }>;
    cities: Array<{ city: string | null; country: string | null; count: number }>;
  };
  funnel: {
    steps: Array<{ step: number; eventType: string; count: number }>;
    abandonment: Array<{ step: number; count: number }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'devices' | 'funnel'>('overview');

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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
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

  const funnelData = {
    visitors: data?.overview.visitors || 0,
    formOpens: data?.overview.formOpens || 0,
    step1: data?.funnel.steps.find(f => f.step === 1 && f.eventType === 'step_completed')?.count || 0,
    step2: data?.funnel.steps.find(f => f.step === 2 && f.eventType === 'step_completed')?.count || 0,
    bookings: data?.overview.bookings || 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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
          <div className="stat-value text-green-600">{data?.overview.conversionRate || 0}%</div>
          <div className="stat-label">Conversion</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {(['overview', 'traffic', 'devices', 'funnel'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Engagement Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatDuration(data?.engagement.avgSessionDuration || 0)}
                </div>
                <div className="text-sm text-slate-500">Avg Session Duration</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {data?.engagement.avgPagesPerSession || 0}
                </div>
                <div className="text-sm text-slate-500">Pages per Session</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatDuration(data?.engagement.avgTimeOnSite || 0)}
                </div>
                <div className="text-sm text-slate-500">Avg Time on Site</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {data?.engagement.avgScrollDepth || 0}%
                </div>
                <div className="text-sm text-slate-500">Avg Scroll Depth</div>
              </div>
            </div>
          </div>

          {/* New vs Returning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">New vs Returning Visitors</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-600">New</span>
                    <span className="text-sm font-medium">{data?.overview.newVisitors || 0}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${getPercentage(data?.overview.newVisitors || 0, data?.overview.visitors || 1)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-600">Returning</span>
                    <span className="text-sm font-medium">{data?.overview.returningVisitors || 0}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${getPercentage(data?.overview.returningVisitors || 0, data?.overview.visitors || 1)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Form Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{data?.overview.formOpens || 0}</div>
                  <div className="text-sm text-slate-500">Form Opens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{data?.overview.formConversionRate || 0}%</div>
                  <div className="text-sm text-slate-500">Form → Booking Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Countries</h3>
              {data?.locations.countries && data.locations.countries.length > 0 ? (
                <div className="space-y-3">
                  {data.locations.countries.slice(0, 8).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.country || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${getPercentage(item.count, data.overview.visitors)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-10 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Cities</h3>
              {data?.locations.cities && data.locations.cities.length > 0 ? (
                <div className="space-y-3">
                  {data.locations.cities.slice(0, 8).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">
                        {item.city || 'Unknown'}{item.country ? `, ${item.country}` : ''}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Traffic Tab */}
      {activeTab === 'traffic' && (
        <div className="space-y-6">
          {/* UTM Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Sources (utm_source)</h3>
              {data?.traffic.sources && data.traffic.sources.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.sources.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.source || 'Direct'}</span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Mediums (utm_medium)</h3>
              {data?.traffic.mediums && data.traffic.mediums.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.mediums.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.medium || 'None'}</span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Campaigns (utm_campaign)</h3>
              {data?.traffic.campaigns && data.traffic.campaigns.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.campaigns.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate max-w-[150px]" title={item.campaign || ''}>
                        {item.campaign || 'None'}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Referrers & Landing Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Referrers</h3>
              {data?.traffic.referrers && data.traffic.referrers.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.referrers.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate max-w-[250px]" title={item.referrer}>
                        {item.referrer?.replace(/^https?:\/\//, '').split('/')[0] || 'Direct'}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Top Landing Pages</h3>
              {data?.traffic.landingPages && data.traffic.landingPages.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.landingPages.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 truncate max-w-[250px]" title={item.page}>
                        {item.page?.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Device Types</h3>
              {data?.devices.types && data.devices.types.length > 0 ? (
                <div className="space-y-3">
                  {data.devices.types.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 capitalize">{item.device || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${getPercentage(item.count, data.overview.visitors)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-10 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Browsers</h3>
              {data?.devices.browsers && data.devices.browsers.length > 0 ? (
                <div className="space-y-3">
                  {data.devices.browsers.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.browser || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${getPercentage(item.count, data.overview.visitors)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-10 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Operating Systems</h3>
              {data?.devices.operatingSystems && data.devices.operatingSystems.length > 0 ? (
                <div className="space-y-3">
                  {data.devices.operatingSystems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{item.os || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${getPercentage(item.count, data.overview.visitors)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-10 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Funnel Tab */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Visual Funnel */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Conversion Funnel</h2>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Visitors', value: funnelData.visitors, color: 'bg-slate-300' },
                { label: 'Form Opens', value: funnelData.formOpens, color: 'bg-blue-300' },
                { label: 'Step 1 Done', value: funnelData.step1, color: 'bg-blue-400' },
                { label: 'Step 2 Done', value: funnelData.step2, color: 'bg-blue-500' },
                { label: 'Booked', value: funnelData.bookings, color: 'bg-green-500' },
              ].map((step, index) => (
                <div key={step.label} className="text-center">
                  <div className={`h-32 ${step.color} rounded-lg flex items-end justify-center mb-2 relative overflow-hidden`}>
                    <div 
                      className="bg-primary-600 w-full absolute bottom-0 transition-all"
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
                      {getPercentage(step.value, funnelData.visitors)}% of visitors
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Drop-off Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Step-by-Step Drop-off</h3>
              <div className="space-y-4">
                {[
                  { from: 'Visitors', to: 'Form Open', fromVal: funnelData.visitors, toVal: funnelData.formOpens },
                  { from: 'Form Open', to: 'Step 1', fromVal: funnelData.formOpens, toVal: funnelData.step1 },
                  { from: 'Step 1', to: 'Step 2', fromVal: funnelData.step1, toVal: funnelData.step2 },
                  { from: 'Step 2', to: 'Booked', fromVal: funnelData.step2, toVal: funnelData.bookings },
                ].map((item, index) => {
                  const dropoff = item.fromVal - item.toVal;
                  const dropoffRate = item.fromVal > 0 ? Math.round((dropoff / item.fromVal) * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm">
                        <span className="text-slate-600">{item.from}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-slate-900 font-medium">{item.to}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">-{dropoff} ({dropoffRate}%)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-500 mb-4">Form Abandonment by Step</h3>
              {data?.funnel.abandonment && data.funnel.abandonment.length > 0 ? (
                <div className="space-y-3">
                  {data.funnel.abandonment.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-slate-700">Abandoned at Step {item.step}</span>
                      <span className="text-sm font-medium text-red-600">{item.count} users</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No abandonment data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
