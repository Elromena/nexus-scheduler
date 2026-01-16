'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DateRangeSelector from '../components/DateRangeSelector';

interface LocationData {
  country?: string | null;
  city?: string | null;
  count: number;
}

export default function LocationsReportPage() {
  const [countries, setCountries] = useState<LocationData[]>([]);
  const [cities, setCities] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'countries' | 'cities'>('countries');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  const [months, setMonths] = useState(12);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);

  useEffect(() => {
    const now = new Date();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setEndMonth(end);
    setStartMonth(start);
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, months, startMonth, endMonth, useCustomRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      let url = `/scheduler/api/reports?type=locations&page=${page}&limit=20`;
      
      if (useCustomRange && startMonth && endMonth) {
        url += `&startMonth=${startMonth}&endMonth=${endMonth}`;
      } else {
        url += `&months=${months}`;
      }

      const response = await fetch(url, {
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
      setCountries(result.data?.countries || []);
      setCities(result.data?.cities || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('admin_token');
    let url = `/scheduler/api/reports/export?type=locations`;
    
    if (useCustomRange && startMonth && endMonth) {
      url += `&startMonth=${startMonth}&endMonth=${endMonth}`;
    } else {
      url += `&months=${months}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `locations-report.csv`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    }
  };

  const handleMonthsChange = (m: number) => {
    setUseCustomRange(false);
    setMonths(m);
    setPage(1);
  };

  const handleCustomRangeChange = (start: string, end: string) => {
    setUseCustomRange(true);
    setStartMonth(start);
    setEndMonth(end);
    setPage(1);
  };

  const totalCountryLeads = countries.reduce((sum, c) => sum + c.count, 0);
  const totalCityLeads = cities.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/reports" className="text-slate-500 hover:text-slate-700">Reports</Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900">Locations</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Geographic Distribution</h1>
          <p className="text-slate-500">Where your leads are coming from</p>
        </div>
        <button onClick={handleExport} className="btn-outline flex items-center gap-2">
          <span>📥</span> Export CSV
        </button>
      </div>

      <DateRangeSelector
        months={months}
        startMonth={startMonth}
        endMonth={endMonth}
        onMonthsChange={handleMonthsChange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('countries')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'countries'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Countries
        </button>
        <button
          onClick={() => setActiveTab('cities')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'cities'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Cities
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-red-600">{error}</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {activeTab === 'countries' ? (
            <>
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Countries</h2>
                <p className="text-sm text-slate-500">{countries.length} countries, {totalCountryLeads} total leads</p>
              </div>
              {countries.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No location data available</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {countries.map((item, index) => {
                    const percent = totalCountryLeads > 0 ? (item.count / totalCountryLeads) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🌍</span>
                          <span className="font-medium text-slate-900">{item.country || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="text-sm text-slate-500 w-16 text-right">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Cities</h2>
                <p className="text-sm text-slate-500">{cities.length} cities, {totalCityLeads} total leads</p>
              </div>
              {cities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No location data available</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cities.map((item, index) => {
                    const percent = totalCityLeads > 0 ? (item.count / totalCityLeads) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📍</span>
                          <div>
                            <span className="font-medium text-slate-900">{item.city || 'Unknown'}</span>
                            {item.country && (
                              <span className="text-slate-500 ml-2">{item.country}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                          <span className="text-sm text-slate-500 w-16 text-right">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
