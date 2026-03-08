import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import { useNavigate } from '@tanstack/react-router';
import type { TurbineMetrics } from '../../types';

interface CostBenefitMatrixProps {
  turbines: TurbineMetrics[];
}

const QUADRANT_LABELS = [
  { x: 75, y: 75, label: 'ACT NOW', color: '#D50000' },
  { x: 25, y: 75, label: 'SCHEDULE', color: '#FF9100' },
  { x: 75, y: 25, label: 'MONITOR', color: '#FF9100' },
  { x: 25, y: 25, label: 'ROUTINE', color: '#00C853' },
];

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { id: string; failureProb: number; failureCost: number; rul: number; color: string };
  onClick?: (id: string) => void;
}

function CustomDot({ cx = 0, cy = 0, payload, onClick }: CustomDotProps) {
  if (!payload) return null;
  const r = Math.max(6, Math.min(18, 20 - payload.rul / 15));
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onClick && onClick(payload.id)}>
      <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.7} stroke={payload.color} strokeWidth={1.5} />
      <text x={cx} y={cy + 3} textAnchor="middle" fill="white" fontSize={7} fontFamily="JetBrains Mono" fontWeight="bold">
        {payload.id.replace('T-', '')}
      </text>
    </g>
  );
}

export default function CostBenefitMatrix({ turbines }: CostBenefitMatrixProps) {
  const navigate = useNavigate();

  const data = turbines.map((t, i) => ({
    id: t.id,
    failureProb: t.failureProbability * 100,
    failureCost: 20 + (i % 5) * 18 + t.failureProbability * 40,
    rul: t.remainingUsefulLife,
    color: t.riskLevel === 'critical' ? '#D50000' : t.riskLevel === 'warning' ? '#FF9100' : '#00C853',
  }));

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-4">
        <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Maintenance Decision Matrix
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Bubble size = urgency (smaller = more urgent) • Click to inspect
        </p>
      </div>

      {/* Quadrant labels */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-1 mb-1 text-xs font-bold text-center">
          <div className="py-1 rounded" style={{ backgroundColor: 'rgba(255,145,0,0.1)', color: '#FF9100' }}>SCHEDULE</div>
          <div className="py-1 rounded" style={{ backgroundColor: 'rgba(213,0,0,0.1)', color: '#D50000' }}>ACT NOW</div>
          <div className="py-1 rounded" style={{ backgroundColor: 'rgba(0,200,83,0.1)', color: '#00C853' }}>ROUTINE</div>
          <div className="py-1 rounded" style={{ backgroundColor: 'rgba(255,145,0,0.1)', color: '#FF9100' }}>MONITOR</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            type="number" dataKey="failureCost" name="Failure Cost"
            label={{ value: 'Failure Cost ($M)', position: 'insideBottom', offset: -10, fill: 'var(--color-text-secondary)', fontSize: 10 }}
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            type="number" dataKey="failureProb" name="Failure Probability"
            label={{ value: 'Failure Prob (%)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)', fontSize: 10 }}
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                  <p className="font-mono font-bold" style={{ color: d.color }}>{d.id}</p>
                  <p style={{ color: 'var(--color-text-secondary)' }}>Failure Prob: <span className="font-mono">{d.failureProb.toFixed(0)}%</span></p>
                  <p style={{ color: 'var(--color-text-secondary)' }}>Cost: <span className="font-mono">${d.failureCost.toFixed(0)}M</span></p>
                  <p style={{ color: 'var(--color-text-secondary)' }}>RUL: <span className="font-mono">{d.rul.toFixed(0)} days</span></p>
                </div>
              );
            }}
          />
          <ReferenceLine x={50} stroke="var(--color-border)" strokeDasharray="6 3" strokeWidth={1.5} />
          <ReferenceLine y={50} stroke="var(--color-border)" strokeDasharray="6 3" strokeWidth={1.5} />
          <Scatter
            data={data}
            shape={(props: CustomDotProps) => <CustomDot {...props} onClick={(id) => navigate({ to: '/turbine/$id', params: { id } })} />}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
