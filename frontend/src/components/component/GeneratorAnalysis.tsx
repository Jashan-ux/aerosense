import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { TurbineMetrics } from '../../types';
import RulCard from './RulCard';

interface GeneratorAnalysisProps {
  turbine: TurbineMetrics;
}

export default function GeneratorAnalysis({ turbine }: GeneratorAnalysisProps) {
  const tempData = turbine.sensorReadings.map((r, i) => ({
    day: i + 1,
    stator: 55 + r.powerEfficiency * 20 + Math.sin(i * 0.4) * 3,
    rotor: 48 + r.powerEfficiency * 15 + Math.sin(i * 0.6) * 2,
  }));

  const latest = turbine.sensorReadings[turbine.sensorReadings.length - 1];
  const phaseData = latest ? [
    { phase: 'L1', current: latest.phaseCurrent + 2, fill: '#2979FF' },
    { phase: 'L2', current: latest.phaseCurrent - 15, fill: '#00C853' },
    { phase: 'L3', current: latest.phaseCurrent - 2, fill: '#FF9100' },
  ] : [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Temperature trends */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Generator Temperature Trends
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={tempData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} unit="°C" />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [`${v.toFixed(1)}°C`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="stator" stroke="#D50000" strokeWidth={2} dot={false} name="Stator Temp" />
            <Line type="monotone" dataKey="rotor" stroke="#2979FF" strokeWidth={2} dot={false} name="Rotor Temp" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phase current balance */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Phase Current Balance
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={phaseData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
              <XAxis dataKey="phase" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} unit="A" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
                formatter={(v: number) => [`${v.toFixed(0)}A`, 'Current']}
              />
              <Bar dataKey="current" radius={[4, 4, 0, 0]}>
                {phaseData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2 text-xs font-mono">
            {phaseData.map((p, i) => (
              <div key={i} className="text-center">
                <div className="font-bold" style={{ color: p.fill }}>{p.phase}</div>
                <div style={{ color: 'var(--color-text-secondary)' }}>{p.current.toFixed(0)}A</div>
              </div>
            ))}
          </div>
        </div>

        <RulCard
          rul={Math.round(turbine.remainingUsefulLife * 2)}
          confidence={82}
          replacementCost="$280,000"
          degradationRate="Gradual"
        />
      </div>
    </div>
  );
}
