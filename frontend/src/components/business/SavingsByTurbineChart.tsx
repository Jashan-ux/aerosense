import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useNavigate } from '@tanstack/react-router';
import type { TurbineMetrics } from '../../types';

interface SavingsByTurbineChartProps {
  turbines: TurbineMetrics[];
}

export default function SavingsByTurbineChart({ turbines }: SavingsByTurbineChartProps) {
  const navigate = useNavigate();

  const data = turbines.map((t, i) => ({
    id: t.id,
    savings: Math.round(50 + (1 - t.failureProbability) * 150 + i * 3),
    failures: Math.round((1 - t.failureProbability) * 20),
    color: t.riskLevel === 'healthy' ? '#00C853' : t.riskLevel === 'warning' ? '#FF9100' : '#D50000',
  }));

  const maxSavings = Math.max(...data.map(d => d.savings));

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Savings Contribution by Turbine
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Click a bar to view turbine details
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
          <XAxis
            dataKey="id"
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => `$${v}M`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            formatter={(v: number, name: string) => [name === 'savings' ? `$${v}M` : v, name === 'savings' ? 'Savings' : 'Failures Prevented']}
          />
          <Bar
            dataKey="savings"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(d) => navigate({ to: '/turbine/$id', params: { id: d.id } })}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={0.4 + (entry.savings / maxSavings) * 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
