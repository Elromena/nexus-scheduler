'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReportTable from '../components/ReportTable';
import DateRangeSelector from '../components/DateRangeSelector';

interface ReportData {
  industry: string | null;
  count: number;
  currentMonth: number;
  previousMonth: number;
  change: { value: number; direction: 'up' | 'down' | 'same' };
}

export default function IndustriesReportPage() {
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      let url = `/scheduler/api/reports?type=industries&page=${page}&limit=10`;
      
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
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('admin_token');
    let url = `/scheduler/api/reports/export?type=industries`;
    
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
      a.download = `industries-report.csv`;
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
    label: item.industry || 'Not Specified',
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
            <span className="text-slate-900">Industries</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Industry Breakdown</h1>
          <p className="text-slate-500">Leads by vertical/industry</p>
        </div>
      </div>

      <DateRangeSelector
        months={months}
        startMonth={startMonth}
        endMonth={endMonth}
        onMonthsChange={handleMonthsChange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      <ReportTable
        title="Industries"
        labelHeader="Industry"
        data={tableData}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={setPage}
        onExport={handleExport}
      />
    </div>
  );
}
