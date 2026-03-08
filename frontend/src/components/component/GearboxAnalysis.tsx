import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import type { TurbineMetrics } from '../../types';
import RulCard from './RulCard';

interface GearboxAnalysisProps {
  turbine: TurbineMetrics;
}

export default function GearboxAnalysis({ turbine }: GearboxAnalysisProps) {
  const tempData = turbine.sensorReadings.map((r, i) => ({
    day: i + 1,
    actual: r.gearboxTemp,
    expected: 65 + Math.sin(i * 0.3) * 2,
    date: new Date(Number(r.timestamp)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const latest = turbine.sensorReadings[turbine.sensorReadings.length - 1];
  const bearingTemps = latest ? [
    { label: 'High-Speed Bearing', temp: latest.gearboxTemp + 3, status: latest.gearboxTemp > 75 ? '#D50000' : '#00C853' },
    { label: 'Intermediate Bearing', temp: latest.gearboxTemp - 2, status: latest.gearboxTemp > 70 ? '#FF9100' : '#00C853' },
    { label: 'Low-Speed Bearing', temp: latest.gearboxTemp - 5, status: '#00C853' },
  ] : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Temperature trend */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Gearbox Temperature Trend (30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={tempData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} unit="°C" />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [`${v.toFixed(1)}°C`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <ReferenceLine y={75} stroke="#D50000" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Critical', fill: '#D50000', fontSize: 9 }} />
            <ReferenceLine y={65} stroke="#FF9100" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Baseline', fill: '#FF9100', fontSize: 9 }} />
            <Line type="monotone" dataKey="actual" stroke="#D50000" strokeWidth={2} dot={false} name="Actual Temp" />
            <Line type="monotone" dataKey="expected" stroke="#2979FF" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Expected" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bearing health */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Bearing Health Indicators
          </h3>
          <div className="space-y-3">
            {bearingTemps.map((b, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{b.label}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: b.status }}>{b.temp.toFixed(1)}°C</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (b.temp / 100) * 100)}%`, backgroundColor: b.status }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RUL Card */}
        <RulCard
          rul={Math.round(turbine.remainingUsefulLife * 1.5)}
          confidence={75}
          replacementCost="$450,000"
          degradationRate="Accelerating"
        />
      </div>
    </div>
  );
}
