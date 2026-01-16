'use client';

import { useState } from 'react';

interface DateRangeSelectorProps {
  months: number;
  startMonth: string;
  endMonth: string;
  onMonthsChange: (months: number) => void;
  onCustomRangeChange: (start: string, end: string) => void;
}

export default function DateRangeSelector({
  months,
  startMonth,
  endMonth,
  onMonthsChange,
  onCustomRangeChange,
}: DateRangeSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  // Generate month options for the last 24 months
  const getMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setMode('preset')}
          className={`px-3 py-1 text-sm rounded ${
            mode === 'preset' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Preset
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-3 py-1 text-sm rounded ${
            mode === 'custom' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          Custom
        </button>
      </div>

      {mode === 'preset' ? (
        <select
          value={months}
          onChange={(e) => onMonthsChange(parseInt(e.target.value))}
          className="form-select w-auto"
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={startMonth}
            onChange={(e) => onCustomRangeChange(e.target.value, endMonth)}
            className="form-select w-auto"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="text-slate-500">to</span>
          <select
            value={endMonth}
            onChange={(e) => onCustomRangeChange(startMonth, e.target.value)}
            className="form-select w-auto"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
