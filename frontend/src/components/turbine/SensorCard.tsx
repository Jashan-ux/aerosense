import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useNavigate } from '@tanstack/react-router';

export type SensorStatus = 'CRITICAL' | 'WARNING' | 'MONITOR' | 'NORMAL';

interface SensorCardProps {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  status: SensorStatus;
  trend: 'up' | 'down' | 'stable';
  sparkData: number[];
  componentType: string;
  formatValue?: (v: number) => string;
}

const STATUS_COLORS: Record<SensorStatus, string> = {
  CRITICAL: '#D50000',
  WARNING: '#FF9100',
  MONITOR: '#2979FF',
  NORMAL: '#00C853',
};

export default function SensorCard({
  label, current, baseline, unit, status, trend, sparkData, componentType, formatValue,
}: SensorCardProps) {
  const navigate = useNavigate();
  const color = STATUS_COLORS[status];
  const delta = current - baseline;
  const deltaSign = delta > 0 ? '+' : '';
  const fmt = formatValue || ((v: number) => v.toFixed(1));

  const chartData = sparkData.map((v, i) => ({ i, v }));

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up'
    ? (status === 'CRITICAL' || status === 'WARNING' ? '#D50000' : '#00C853')
    : trend === 'down'
    ? (status === 'CRITICAL' || status === 'WARNING' ? '#00C853' : '#D50000')
    : '#9CA3AF';

  return (
    <div
      className="industrial-card p-4 cursor-pointer"
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => navigate({ to: '/component/$type', params: { type: componentType } })}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-montserrat font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {status}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xl font-bold" style={{ color }}>
            {fmt(current)}<span className="text-sm ml-0.5">{unit}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
              Base: {fmt(baseline)}{unit}
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: delta > 0 ? '#D50000' : '#00C853' }}>
              {deltaSign}{fmt(delta)}{unit}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TrendIcon size={14} style={{ color: trendColor }} />
          <ResponsiveContainer width={60} height={28}>
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
