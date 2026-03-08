import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { TurbineMetrics } from '../../types';
import RulCard from './RulCard';

interface BladeRotorAnalysisProps {
  turbine: TurbineMetrics;
}

export default function BladeRotorAnalysis({ turbine }: BladeRotorAnalysisProps) {
  const rotorData = turbine.sensorReadings.map((r, i) => ({
    day: i + 1,
    rpm: r.rpm,
    expected: 1500,
    vibration: r.vibration,
  }));

  const latest = turbine.sensorReadings[turbine.sensorReadings.length - 1];
  const pitchDeviation = latest ? ((latest.drivetrainRatio - 100) / 100 * 5).toFixed(2) : '0.00';
  const aerodynamicEff = latest ? (latest.powerEfficiency * 100).toFixed(1) : '88.0';
  const imbalanceDetected = latest ? latest.vibration > 2.5 : false;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Rotor speed */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Rotor Speed Consistency
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rotorData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} unit=" RPM" />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="rpm" stroke="#2979FF" strokeWidth={2} dot={false} name="Actual RPM" />
            <Line type="monotone" dataKey="expected" stroke="#00C853" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Expected RPM" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blade metrics */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Blade Health Indicators
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Pitch Angle Deviation</span>
              <span className="font-mono text-sm font-bold" style={{ color: Math.abs(parseFloat(pitchDeviation)) > 2 ? '#FF9100' : '#00C853' }}>
                {pitchDeviation}°
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Aerodynamic Efficiency</span>
              <span className="font-mono text-sm font-bold" style={{ color: parseFloat(aerodynamicEff) < 85 ? '#FF9100' : '#00C853' }}>
                {aerodynamicEff}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Imbalance Detected</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: imbalanceDetected ? 'rgba(213,0,0,0.15)' : 'rgba(0,200,83,0.15)',
                  color: imbalanceDetected ? '#D50000' : '#00C853',
                }}
              >
                {imbalanceDetected ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Vibration Level</span>
              <span className="font-mono text-sm font-bold" style={{ color: latest && latest.vibration > 2.5 ? '#D50000' : '#00C853' }}>
                {latest ? latest.vibration.toFixed(2) : '1.20'} mm/s
              </span>
            </div>
          </div>
        </div>

        <RulCard
          rul={Math.round(turbine.remainingUsefulLife * 3)}
          confidence={88}
          replacementCost="$180,000"
          degradationRate="Stable"
        />
      </div>
    </div>
  );
}
