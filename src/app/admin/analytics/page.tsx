'use client';

import { useState, useEffect, useCallback } from 'react';
import DateRangeSelector, { DatePreset } from '@/components/analytics/DateRangeSelector';
import TrendChart from '@/components/analytics/TrendChart';

interface AnalyticsData {
  period: {
    preset: string;
    startDate: string;
    endDate: string;
    previousStartDate: string | null;
    previousEndDate: string | null;
  };
  overview: {
    current: {
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
    previous: {
      visitors: number;
      sessions: number;
      pageViews: number;
      formOpens: number;
      bookings: number;
      conversionRate: number;
      formConversionRate: number;
      newVisitors: number;
      returningVisitors: number;
    } | null;
    changes: {
      visitors: number | null;
      sessions: number | null;
      pageViews: number | null;
      formOpens: number | null;
      bookings: number | null;
      conversionRate: number | null;
    } | null;
  };
  trend: Array<{
    date: string;
    visitors: number;
    formOpens: number;
    bookings: number;
  }>;
  traffic: {
    sources: Array<{ source: string | null; count: number }>;
    referrers: Array<{ referrer: string; count: number }>;
    landingPages: Array<{ page: string; count: number }>;
  };
  devices: {
    types: Array<{ device: string | null; count: number }>;
    browsers: Array<{ browser: string | null; count: number }>;
  };
  locations: {
    countries: Array<{ country: string | null; count: number }>;
    cities: Array<{ city: string | null; country: string | null; count: number }>;
  };
  funnel: {
    steps: Array<{ step: number; eventType: string; count: number }>;
  };
}

// Metric card component
function MetricCard({
  label,
  value,
  change,
  format = 'number',
}: {
  label: string;
  value: number;
  change?: number | null;
  format?: 'number' | 'percent';
}) {
  const formatValue = (val: number) => {
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  const formatChange = (ch: number) => {
    if (format === 'percent') return `${ch > 0 ? '+' : ''}${ch.toFixed(1)}pp`;
    return `${ch > 0 ? '+' : ''}${ch.toFixed(0)}%`;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{formatValue(value)}</span>
        {change !== null && change !== undefined && (
          <span
            className={`text-sm font-medium ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-500'
            }`}
          >
            {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {formatChange(Math.abs(change))}
          </span>
        )}
      </div>
    </div>
  );
}

// Breakdown table component
function BreakdownTable({
  title,
  data,
  labelKey,
  countKey = 'count',
  total,
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  labelKey: string;
  countKey?: string;
  total: number;
}) {
  // Format URL for display - referrers show domain, pages show path
  const formatUrl = (url: string, isReferrer: boolean) => {
    if (!url) return isReferrer ? '(direct)' : '/';
    try {
      const parsed = new URL(url);
      if (isReferrer) {
        // For referrers, show the domain (optionally with path if meaningful)
        const domain = parsed.hostname.replace('www.', '');
        const path = parsed.pathname !== '/' ? parsed.pathname : '';
        const fullRef = domain + path;
        return fullRef.length > 35 ? fullRef.slice(0, 35) + '...' : fullRef;
      } else {
        // For landing pages, show the path
        const path = parsed.pathname || '/';
        return path.length > 35 ? path.slice(0, 35) + '...' : path;
      }
    } catch {
      // Not a valid URL, just truncate
      return url.length > 35 ? url.slice(0, 35) + '...' : url;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No data available</p>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 5).map((item, idx) => {
            const label = String(item[labelKey] || '(none)');
            const count = Number(item[countKey] || 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const isReferrer = labelKey.includes('referrer');
            const isUrl = isReferrer || labelKey.includes('page');
            const displayLabel = isUrl ? formatUrl(label, isReferrer) : label;

            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate" title={label}>
                    {displayLabel}
                  </span>
                  <span className="text-slate-500 ml-2">
                    {count.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Funnel visualization
function FunnelChart({ 
  visitors, 
  formOpens, 
  steps, 
  bookings 
}: { 
  visitors: number;
  formOpens: number;
  steps: Array<{ step: number; eventType: string; count: number }>;
  bookings: number;
}) {
  const getStepCount = (eventType: string) => {
    const step = steps.find(s => s.eventType === eventType);
    return step?.count || 0;
  };

  const funnelData = [
    { label: 'Visitors', count: visitors, color: 'bg-slate-400' },
    { label: 'Form Opens', count: formOpens, color: 'bg-blue-400' },
    { label: 'Step 1 Complete', count: getStepCount('step_completed'), color: 'bg-blue-500' },
    { label: 'Booked', count: bookings, color: 'bg-green-500' },
  ];

  const maxCount = Math.max(...funnelData.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {funnelData.map((item, idx) => {
          const width = (item.count / maxCount) * 100;
          const convRate = idx > 0 && funnelData[idx - 1].count > 0
            ? ((item.count / funnelData[idx - 1].count) * 100).toFixed(1)
            : null;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700">{item.label}</span>
                <span className="text-slate-500">
                  {item.count.toLocaleString()}
                  {convRate && <span className="text-xs ml-1">({convRate}%)</span>}
                </span>
              </div>
              <div className="h-6 bg-slate-100 rounded overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {visitors > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Overall Conversion Rate</span>
            <span className="font-semibold text-green-600">
              {((bookings / visitors) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [preset, setPreset] = useState<DatePreset>('last30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compare, setCompare] = useState(true);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'funnel'>('overview');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        preset,
        compare: compare.toString(),
      });
      
      if (preset === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const response = await fetch(`/scheduler/api/analytics?${params}`, {
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
      
      // Update date display
      if (result.data.period) {
        setStartDate(result.data.period.startDate);
        setEndDate(result.data.period.endDate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [preset, compare, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="btn-outline text-sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        compare={compare}
        onPresetChange={setPreset}
        onDateChange={handleDateChange}
        onCompareChange={setCompare}
      />

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Visitors"
              value={data.overview.current.visitors}
              change={data.overview.changes?.visitors}
            />
            <MetricCard
              label="Form Opens"
              value={data.overview.current.formOpens}
              change={data.overview.changes?.formOpens}
            />
            <MetricCard
              label="Bookings"
              value={data.overview.current.bookings}
              change={data.overview.changes?.bookings}
            />
            <MetricCard
              label="Conversion Rate"
              value={data.overview.current.conversionRate}
              change={data.overview.changes?.conversionRate}
              format="percent"
            />
          </div>

          {/* Trend Chart */}
          <TrendChart data={data.trend} />

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex gap-6">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'traffic', label: 'Traffic' },
                { key: 'funnel', label: 'Funnel' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Additional metrics */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Visitor Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">New Visitors</span>
                    <span className="font-medium">{data.overview.current.newVisitors.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Returning Visitors</span>
                    <span className="font-medium">{data.overview.current.returningVisitors.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sessions</span>
                    <span className="font-medium">{data.overview.current.sessions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Page Views</span>
                    <span className="font-medium">{data.overview.current.pageViews.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <BreakdownTable
                title="Top Countries"
                data={data.locations.countries}
                labelKey="country"
                total={data.overview.current.visitors}
              />

              <BreakdownTable
                title="Top Cities"
                data={data.locations.cities}
                labelKey="city"
                total={data.overview.current.visitors}
              />

              <BreakdownTable
                title="Devices"
                data={data.devices.types}
                labelKey="device"
                total={data.overview.current.visitors}
              />

              <BreakdownTable
                title="Browsers"
                data={data.devices.browsers}
                labelKey="browser"
                total={data.overview.current.visitors}
              />

              <FunnelChart
                visitors={data.overview.current.visitors}
                formOpens={data.overview.current.formOpens}
                steps={data.funnel.steps}
                bookings={data.overview.current.bookings}
              />
            </div>
          )}

          {activeTab === 'traffic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <BreakdownTable
                title="Traffic Sources (UTM)"
                data={data.traffic.sources}
                labelKey="source"
                total={data.overview.current.visitors}
              />

              <BreakdownTable
                title="Top Referrers"
                data={data.traffic.referrers}
                labelKey="referrer"
                total={data.overview.current.visitors}
              />

              <BreakdownTable
                title="Top Landing Pages"
                data={data.traffic.landingPages}
                labelKey="page"
                total={data.overview.current.visitors}
              />
            </div>
          )}

          {activeTab === 'funnel' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FunnelChart
                visitors={data.overview.current.visitors}
                formOpens={data.overview.current.formOpens}
                steps={data.funnel.steps}
                bookings={data.overview.current.bookings}
              />

              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Funnel Metrics</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-600">Visitor → Form Open Rate</div>
                    <div className="text-xl font-bold text-slate-900">
                      {data.overview.current.visitors > 0
                        ? ((data.overview.current.formOpens / data.overview.current.visitors) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-600">Form Open → Booking Rate</div>
                    <div className="text-xl font-bold text-slate-900">
                      {data.overview.current.formOpens > 0
                        ? ((data.overview.current.bookings / data.overview.current.formOpens) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600">Overall Conversion Rate</div>
                    <div className="text-xl font-bold text-green-700">
                      {data.overview.current.conversionRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compare hint */}
          {compare && data.overview.previous && (
            <div className="text-center text-sm text-slate-500">
              Comparing to previous period: {new Date(data.period.previousStartDate || '').toLocaleDateString()} - {new Date(data.period.previousEndDate || '').toLocaleDateString()}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
