'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReportTable from '../components/ReportTable';
import DateRangeSelector from '../components/DateRangeSelector';

interface ReportData {
  dealStage: string | null;
  count: number;
  currentMonth: number;
  previousMonth: number;
  change: { value: number; direction: 'up' | 'down' | 'same' };
}

interface MonthlyBreakdownItem {
  month: string;
  dealStage: string | null;
  count: number;
}

export default function DealStagesReportPage() {
  const [data, setData] = useState<ReportData[]>([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  const [months, setMonths] = useState(12);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      let url = `/scheduler/api/reports?type=deal-stages&page=${page}&limit=10`;
      
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
      setData(result.data || []);
      setMonthlyBreakdown(result.monthlyBreakdown || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/scheduler/api/hubspot/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      setSyncMessage({ type: 'success', text: result.message || 'Sync completed' });
      // Refresh data after sync
      fetchData();
    } catch (err) {
      setSyncMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('admin_token');
    let url = `/scheduler/api/reports/export?type=deal-stages`;
    
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
      a.download = `deal-stages-report.csv`;
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

  const tableData = data.map((item) => ({
    label: item.dealStage || 'Not Synced',
    count: item.count,
    currentMonth: item.currentMonth,
    previousMonth: item.previousMonth,
    change: item.change,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/reports" className="text-slate-500 hover:text-slate-700">Reports</Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900">Deal Stages</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HubSpot Deal Stages</h1>
          <p className="text-slate-500">Lead progression through your sales pipeline</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          {syncing ? (
            <>
              <div className="spinner border-white border-t-transparent w-4 h-4"></div>
              Syncing...
            </>
          ) : (
            <>
              <span>🔄</span> Sync from HubSpot
            </>
          )}
        </button>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-lg ${
          syncMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {syncMessage.text}
        </div>
      )}

      <DateRangeSelector
        months={months}
        startMonth={startMonth}
        endMonth={endMonth}
        onMonthsChange={handleMonthsChange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      <ReportTable
        title="Deal Stages"
        labelHeader="Stage"
        data={tableData}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={setPage}
        onExport={handleExport}
        monthlyBreakdown={monthlyBreakdown}
        itemKey="dealStage"
      />

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-blue-600">ℹ️</span>
          <div>
            <p className="text-sm text-blue-800 font-medium">About Deal Stage Sync</p>
            <p className="text-sm text-blue-700 mt-1">
              Deal stages are synced from HubSpot. Click &quot;Sync from HubSpot&quot; to update all leads with their 
              current deal stage. This fetches the latest pipeline data from your HubSpot account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
