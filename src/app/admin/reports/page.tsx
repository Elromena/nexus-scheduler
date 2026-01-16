'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MonthlyData {
  month: string;
  count: number;
  change: {
    value: number;
    direction: 'up' | 'down' | 'same';
  };
}

export default function ReportsOverviewPage() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    fetchData();
  }, [months]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/scheduler/api/reports?type=overview&months=${months}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.reload();
          return;
        }
        throw new Error('Failed to fetch report');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/scheduler/api/reports/export?type=leads&months=${months}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-report.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const totalLeads = data.reduce((sum, item) => sum + item.count, 0);
  const currentMonthData = data[0];
  const previousMonthData = data[1];

  const reportCards = [
    { href: '/admin/reports/referrers', label: 'Referrers', icon: '🔗', description: 'See which referrers bring the most leads' },
    { href: '/admin/reports/landing-pages', label: 'Landing Pages', icon: '📄', description: 'Top performing articles and pages' },
    { href: '/admin/reports/industries', label: 'Industries', icon: '🏢', description: 'Leads by vertical/industry' },
    { href: '/admin/reports/locations', label: 'Locations', icon: '🌍', description: 'Geographic distribution of leads' },
    { href: '/admin/reports/deal-stages', label: 'Deal Stages', icon: '💼', description: 'HubSpot deal stage breakdown' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Overview</h1>
          <p className="text-slate-500">Month-over-month lead analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="form-select w-auto"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button onClick={handleExport} className="btn-outline flex items-center gap-2">
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Total Leads ({months}mo)</div>
          <div className="text-3xl font-bold text-slate-900">{totalLeads}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">This Month</div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-slate-900">{currentMonthData?.count || 0}</span>
            {currentMonthData?.change && (
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                currentMonthData.change.direction === 'up' 
                  ? 'bg-green-100 text-green-700' 
                  : currentMonthData.change.direction === 'down'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {currentMonthData.change.direction === 'up' ? '↑' : currentMonthData.change.direction === 'down' ? '↓' : '='} 
                {currentMonthData.change.value}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-1">Last Month</div>
          <div className="text-3xl font-bold text-slate-900">{previousMonthData?.count || 0}</div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Leads by Month</h2>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : data.length === 0 ? (
          <div className="text-slate-500 text-center py-8">No data available</div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => {
              const maxCount = Math.max(...data.map(d => d.count));
              const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              
              return (
                <div key={item.month} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-slate-600">{formatMonth(item.month)}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 rounded-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${Math.max(widthPercent, 5)}%` }}
                    >
                      <span className="text-white text-sm font-medium">{item.count}</span>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    {index < data.length - 1 && item.change && (
                      <span className={`text-sm font-medium ${
                        item.change.direction === 'up' 
                          ? 'text-green-600' 
                          : item.change.direction === 'down'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}>
                        {item.change.direction === 'up' ? '↑' : item.change.direction === 'down' ? '↓' : '='} 
                        {item.change.value}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Links */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Detailed Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block p-4 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{card.icon}</span>
                <span className="font-semibold text-slate-900">{card.label}</span>
              </div>
              <p className="text-sm text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
