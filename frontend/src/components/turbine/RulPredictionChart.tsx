import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, Legend,
} from 'recharts';
import type { TurbineMetrics } from '../../types';

interface RulPredictionChartProps {
  turbine: TurbineMetrics;
  brushRange: [number, number] | null;
}

export default function RulPredictionChart({ turbine, brushRange }: RulPredictionChartProps) {
  const readings = turbine.sensorReadings;
  const allData = readings.map((r, i) => {
    const rul = (r as any).predicted_rul ?? Math.max(0,
      turbine.remainingUsefulLife * (1 - (i / readings.length) * 0.4) + Math.sin(i * 0.5) * 2
    );
    return {
      day: i + 1,
      rul: Math.round(rul),
      upper: Math.round(rul * 1.12),
      lower: Math.round(rul * 0.88),
    };
  });

  const data = brushRange ? allData.slice(brushRange[0], brushRange[1] + 1) : allData;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          RUL Prediction
        </h4>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          Current RUL: <span style={{ color: '#2979FF' }}>{(turbine.remainingUsefulLife ?? 0).toFixed(0)} days</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="rulGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2979FF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2979FF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="confRulGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2979FF" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#2979FF" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            formatter={(v: number) => [`${v} days`, '']}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={7} stroke="#D50000" strokeDasharray="4 4" strokeWidth={1} label={{ value: '7d', fill: '#D50000', fontSize: 9 }} />
          <ReferenceLine y={14} stroke="#FF9100" strokeDasharray="4 4" strokeWidth={1} label={{ value: '14d', fill: '#FF9100', fontSize: 9 }} />
          <ReferenceLine y={30} stroke="#00C853" strokeDasharray="4 4" strokeWidth={1} label={{ value: '30d', fill: '#00C853', fontSize: 9 }} />
          <Area type="stepAfter" dataKey="upper" stroke="none" fill="url(#confRulGrad)" name="Upper Bound" />
          <Area type="stepAfter" dataKey="rul" stroke="#2979FF" strokeWidth={2} fill="url(#rulGrad)" name="RUL (days)" />
          <Area type="stepAfter" dataKey="lower" stroke="none" fill="none" name="Lower Bound" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
