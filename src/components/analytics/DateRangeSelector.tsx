'use client';

import { useState } from 'react';

export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7' 
  | 'last30' 
  | 'last90' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisQuarter' 
  | 'thisYear' 
  | 'allTime' 
  | 'custom';

interface DateRangeSelectorProps {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  compare: boolean;
  onPresetChange: (preset: DatePreset) => void;
  onDateChange: (start: string, end: string) => void;
  onCompareChange: (compare: boolean) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'thisYear', label: 'This year' },
  { value: 'allTime', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export default function DateRangeSelector({
  preset,
  startDate,
  endDate,
  compare,
  onPresetChange,
  onDateChange,
  onCompareChange,
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(preset === 'custom');

  const handlePresetChange = (newPreset: DatePreset) => {
    onPresetChange(newPreset);
    setShowCustom(newPreset === 'custom');
  };

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Preset selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Period:</label>
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
            className="form-input text-sm py-1.5"
          >
            {PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Custom date inputs */}
        {showCustom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate.split('T')[0]}
              onChange={(e) => onDateChange(e.target.value, endDate.split('T')[0])}
              className="form-input text-sm py-1.5"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate.split('T')[0]}
              onChange={(e) => onDateChange(startDate.split('T')[0], e.target.value)}
              className="form-input text-sm py-1.5"
            />
          </div>
        )}

        {/* Date display for non-custom */}
        {!showCustom && startDate && endDate && (
          <div className="text-sm text-slate-600">
            {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
          </div>
        )}

        {/* Compare toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => onCompareChange(e.target.checked)}
              className="form-checkbox h-4 w-4 text-primary-600 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Compare to previous period</span>
          </label>
        </div>
      </div>
    </div>
  );
}
