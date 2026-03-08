import React from 'react';
import type { TurbineMetrics } from '../../types';
import { getHealthColor, getTurbineRiskColor } from '../../lib/mockData';

interface TurbinePopupCardProps {
  turbine: TurbineMetrics;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

const ISSUES: Record<string, string> = {
  '0': 'Gearbox Overheating',
  '10': 'Vibration Anomaly',
  '11': 'Drivetrain Deviation',
  '13': 'Power Efficiency Drop',
  '21': 'Phase Current Imbalance',
};

const ACTIONS: Record<string, string> = {
  critical: 'Inspect within 24 hours',
  warning: 'Schedule within 7 days',
  healthy: 'Continue monitoring',
};

export default function TurbinePopupCard({ turbine, x, y, containerWidth, containerHeight }: TurbinePopupCardProps) {
  const riskColor = getTurbineRiskColor(turbine.riskLevel);
  const healthColor = getHealthColor(turbine.healthScore);
  const issue = ISSUES[turbine.id] || 'Normal operation';
  const action = ACTIONS[turbine.riskLevel] || 'Continue monitoring';

  // Position popup to avoid going off-screen
  const popupWidth = 220;
  const popupHeight = 200;
  let left = x + 20;
  let top = y - 10;

  if (left + popupWidth > containerWidth - 10) left = x - popupWidth - 10;
  if (top + popupHeight > containerHeight - 10) top = containerHeight - popupHeight - 10;
  if (top < 10) top = 10;

  return (
    <div
      className="absolute z-50 rounded-lg shadow-2xl p-3 animate-fade-in"
      style={{
        left,
        top,
        width: popupWidth,
        backgroundColor: 'var(--color-bg-card)',
        border: `1px solid ${riskColor}`,
        pointerEvents: 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {turbine.id}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
          style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
        >
          {turbine.riskLevel}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>Health Score</span>
          <span className="font-mono font-bold" style={{ color: healthColor }}>{(turbine.healthScore ?? 0).toFixed(0)}/100</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>Failure Prob.</span>
          <span className="font-mono font-bold" style={{ color: riskColor }}>{((turbine.failureProbability ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>Est. RUL</span>
          <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>{(turbine.remainingUsefulLife ?? 0).toFixed(0)} days</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>Top Issue</span>
          <span className="font-semibold text-right" style={{ color: riskColor, maxWidth: '120px' }}>{issue}</span>
        </div>
        <div
          className="mt-2 pt-2 text-xs font-semibold"
          style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-accent-blue)' }}
        >
          → {action}
        </div>
      </div>
    </div>
  );
}
