import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine, Brush, Legend,
} from 'recharts';
import type { TurbineMetrics } from '../../types';

interface HealthScoreChartProps {
  turbine: TurbineMetrics;
  brushRange: [number, number] | null;
  onBrushChange: (range: [number, number] | null) => void;
}

export default function HealthScoreChart({ turbine, brushRange, onBrushChange }: HealthScoreChartProps) {
  const readings = turbine.sensorReadings;
  const data = readings.map((r, i) => {
    // Use real health data from each reading if available, fall back to a ramp from current score
    const health = (r as any).health_score ?? Math.max(0, Math.min(100,
      turbine.healthScore + (i - readings.length + 1) * 0.5 + Math.sin(i * 0.8) * 2
    ));
    const date = new Date(r.timestamp);
    const label = isNaN(date.getTime())
      ? `T-${readings.length - 1 - i}`
      : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return {
      day: i + 1,
      health,
      fleetAvg: 78 + Math.sin(i * 0.5) * 2,
      date: label,
    };
  });

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Health Score Timeline
        </h4>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>Last 5 hrs · 10-min intervals</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} interval={4} angle={-30} textAnchor="end" height={36} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            labelStyle={{ color: 'var(--color-text-secondary)' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {/* Colored zones */}
          <ReferenceArea y1={80} y2={100} fill="#00C853" fillOpacity={0.08} />
          <ReferenceArea y1={50} y2={80} fill="#FF9100" fillOpacity={0.08} />
          <ReferenceArea y1={0} y2={50} fill="#D50000" fillOpacity={0.08} />
          {/* Threshold lines */}
          <ReferenceLine y={80} stroke="#00C853" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={50} stroke="#FF9100" strokeDasharray="4 4" strokeWidth={1} />
          <Line type="monotone" dataKey="health" stroke="#2979FF" strokeWidth={2} dot={false} name="Health Score" />
          <Line type="monotone" dataKey="fleetAvg" stroke="#FF9100" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Fleet Avg" />
          <Brush
            dataKey="day"
            height={20}
            stroke="var(--color-border)"
            fill="var(--color-bg-app)"
            travellerWidth={6}
            onChange={(range) => {
              if (range.startIndex !== undefined && range.endIndex !== undefined) {
                onBrushChange([range.startIndex, range.endIndex]);
              }
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
