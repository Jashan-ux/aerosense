import React from 'react';
import { Wind, Thermometer, Zap, Clock, Wrench } from 'lucide-react';
import type { TurbineMetrics } from '../../types';
import { getHealthColor, getTurbineRiskColor } from '../../lib/mockData';

interface QuickStatsBarProps {
  turbine: TurbineMetrics;
}

export default function QuickStatsBar({ turbine }: QuickStatsBarProps) {
  const riskColor = getTurbineRiskColor(turbine.riskLevel);
  const healthColor = getHealthColor(turbine.healthScore);
  const latest = turbine.sensorReadings[turbine.sensorReadings.length - 1];

  const stats = [
    {
      label: 'Status',
      value: (turbine.riskLevel || 'healthy').toUpperCase(),
      color: riskColor,
      icon: null,
      isStatus: true,
    },
    {
      label: 'Health Score',
      value: `${(turbine.healthScore ?? 0).toFixed(0)}/100`,
      color: healthColor,
      icon: null,
    },
    {
      label: 'Power Output',
      value: latest ? `${(latest.powerEfficiency * 2.4).toFixed(1)} MW` : '1.8 MW',
      color: 'var(--color-text-primary)',
      icon: <Zap size={12} />,
    },
    {
      label: 'Wind Speed',
      value: '12 m/s',
      color: 'var(--color-text-primary)',
      icon: <Wind size={12} />,
    },
    {
      label: 'Ambient Temp',
      value: '18°C',
      color: 'var(--color-text-primary)',
      icon: <Thermometer size={12} />,
    },
    {
      label: 'Last Maintenance',
      value: '45 days ago',
      color: turbine.riskLevel === 'critical' ? '#FF9100' : 'var(--color-text-primary)',
      icon: <Clock size={12} />,
    },
    {
      label: 'Next Scheduled',
      value: turbine.riskLevel === 'critical' ? 'OVERDUE' : '14 days',
      color: turbine.riskLevel === 'critical' ? '#D50000' : '#00C853',
      icon: <Wrench size={12} />,
    },
  ];

  return (
    <div
      className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</span>
          <div className="flex items-center gap-1">
            {stat.icon && <span style={{ color: stat.color }}>{stat.icon}</span>}
            <span
              className="font-mono text-sm font-bold"
              style={{
                color: stat.color,
                animation: stat.isStatus && turbine.riskLevel === 'critical' ? 'pulse-red 2s infinite' : undefined,
              }}
            >
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
