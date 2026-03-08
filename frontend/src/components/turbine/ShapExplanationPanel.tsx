import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { TurbineMetrics } from '../../types';
import { SHAP_FEATURE_NAMES, SHAP_TRANSLATIONS } from '../../lib/mockData';

interface ShapExplanationPanelProps {
  turbine: TurbineMetrics;
}

export default function ShapExplanationPanel({ turbine }: ShapExplanationPanelProps) {
  const baseValue = 0.15;
  const contributions = turbine.shapContributions.map((v, i) => ({
    name: SHAP_FEATURE_NAMES[i] || `feature_${i}`,
    value: v,
    translation: SHAP_TRANSLATIONS[SHAP_FEATURE_NAMES[i]] || SHAP_FEATURE_NAMES[i],
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8);

  const finalPrediction = baseValue + contributions.reduce((s, c) => s + c.value, 0);

  // Waterfall data
  const waterfallData = [
    { name: 'Base', value: baseValue, fill: '#9CA3AF' },
    ...contributions.map(c => ({
      name: c.name.replace(/_/g, ' ').slice(0, 16),
      value: c.value,
      fill: c.value > 0 ? '#D50000' : '#2979FF',
    })),
    { name: 'Prediction', value: finalPrediction, fill: finalPrediction > 0.5 ? '#D50000' : '#00C853' },
  ];

  // Feature importance
  const importanceData = contributions.map(c => ({
    name: c.name.replace(/_/g, ' ').slice(0, 18),
    importance: Math.abs(c.value),
    fill: c.value > 0 ? '#D50000' : '#2979FF',
  }));

  const topPositive = contributions.filter(c => c.value > 0).slice(0, 4);

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-4">
        <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Why is this turbine at risk?
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          SHAP feature contributions • Base: {baseValue.toFixed(2)} → Prediction: <span style={{ color: finalPrediction > 0.5 ? '#D50000' : '#00C853' }}>{finalPrediction.toFixed(2)}</span>
        </p>
      </div>

      {/* Waterfall chart */}
      <div className="mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Feature Contributions</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={waterfallData} margin={{ top: 5, right: 5, left: -30, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'var(--color-text-secondary)' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [v.toFixed(3), 'SHAP value']}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {waterfallData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature importance */}
      <div className="mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Feature Importance</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={importanceData} layout="vertical" margin={{ top: 0, right: 5, left: 10, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: 'var(--color-text-secondary)' }} width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
              formatter={(v: number) => [v.toFixed(3), 'Importance']}
            />
            <Bar dataKey="importance" radius={[0, 3, 3, 0]}>
              {importanceData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Human-readable translations */}
      {topPositive.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Key Risk Factors</p>
          <div className="space-y-1.5">
            {topPositive.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: '#D50000' }}>•</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{c.translation}</span>
                <span className="ml-auto font-mono font-bold" style={{ color: '#D50000' }}>+{c.value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
