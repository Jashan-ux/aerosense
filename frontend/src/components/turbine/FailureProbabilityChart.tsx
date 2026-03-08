import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import type { TurbineMetrics } from '../../types';

interface FailureProbabilityChartProps {
  turbine: TurbineMetrics;
  brushRange: [number, number] | null;
}

export default function FailureProbabilityChart({ turbine, brushRange }: FailureProbabilityChartProps) {
  const readings = turbine.sensorReadings;
  const allData = readings.map((r, i) => {
    const probability = (r as any).failure_probability ?? (turbine.failureProbability * (i / readings.length));
    return {
      day: i + 1,
      probability: Math.max(0, Math.min(1, probability)),
      upper: Math.max(0, Math.min(1, probability + 0.05)),
      lower: Math.max(0, Math.min(1, probability - 0.03)),
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
          Failure Probability
        </h4>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          Current: <span style={{ color: '#D50000' }}>{((turbine.failureProbability ?? 0) * 100).toFixed(0)}%</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D50000" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D50000" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF9100" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF9100" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} interval={4} />
          <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
          <Tooltip
            formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={0.038} stroke="#00C853" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Threshold', fill: '#00C853', fontSize: 9 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" name="Confidence Band" />
          <Area type="monotone" dataKey="probability" stroke="#D50000" strokeWidth={2} fill="url(#probGrad)" name="Failure Prob." />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
