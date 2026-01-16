'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TrendData {
  date: string;
  visitors: number;
  formOpens: number;
  bookings: number;
}

interface TrendChartProps {
  data: TrendData[];
}

type MetricKey = 'visitors' | 'formOpens' | 'bookings';

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'visitors', label: 'Visitors', color: '#3b82f6' },
  { key: 'formOpens', label: 'Form Opens', color: '#8b5cf6' },
  { key: 'bookings', label: 'Bookings', color: '#10b981' },
];

export default function TrendChart({ data }: TrendChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['visitors', 'bookings']);

  const toggleMetric = (key: MetricKey) => {
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== key));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-900 mb-1">{formatDate(label)}</p>
          {payload.map((entry: { name: string; value: number; color: string }) => (
            <p key={entry.name} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Trend</h3>
        <div className="flex gap-2">
          {METRICS.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedMetrics.includes(metric.key)
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={{
                backgroundColor: selectedMetrics.includes(metric.key) ? metric.color : undefined,
              }}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {METRICS.map((metric) => (
                  <linearGradient key={metric.key} id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              {METRICS.filter((m) => selectedMetrics.includes(m.key)).map((metric) => (
                <Area
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  name={metric.label}
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${metric.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            No data available for this period
          </div>
        )}
      </div>
    </div>
  );
}
