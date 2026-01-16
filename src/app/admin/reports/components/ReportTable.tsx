'use client';

import { useState } from 'react';

interface Change {
  value: number;
  direction: 'up' | 'down' | 'same';
}

interface ReportItem {
  label: string;
  count: number;
  currentMonth: number;
  previousMonth: number;
  change: Change;
}

interface ReportTableProps {
  title: string;
  data: ReportItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  onExport: () => void;
  labelHeader?: string;
}

export default function ReportTable({
  title,
  data,
  loading,
  error,
  pagination,
  onPageChange,
  onExport,
  labelHeader = 'Name',
}: ReportTableProps) {
  const [pageSize, setPageSize] = useState(10);

  const ChangeIndicator = ({ change }: { change: Change }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      change.direction === 'up' 
        ? 'bg-green-100 text-green-700' 
        : change.direction === 'down'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-600'
    }`}>
      {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '='} 
      {change.value}%
    </span>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <button onClick={onExport} className="btn-outline text-sm flex items-center gap-2">
          <span>📥</span> Export
        </button>
      </div>
      
      {data.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No data available for this period</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">{labelHeader}</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Total</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">This Month</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Last Month</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">MoM Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate" title={item.label}>
                      {item.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">{item.count}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{item.currentMonth}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{item.previousMonth}</td>
                    <td className="px-4 py-3 text-right">
                      <ChangeIndicator change={item.change} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing {data.length} of {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
