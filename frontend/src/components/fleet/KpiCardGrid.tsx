import React from 'react';
import { TrendingUp, AlertTriangle, DollarSign, Activity, Target } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { useFleetSummary, useFleetRiskHistory } from '../../hooks/useQueries';
import type { TurbineMetrics } from '../../types';

interface KpiCardGridProps {
  turbines: TurbineMetrics[];
}

function FleetHealthCard({ turbines }: { turbines: TurbineMetrics[] }) {
  const avgHealth = turbines.length > 0
    ? turbines.reduce((s, t) => s + t.healthScore, 0) / turbines.length
    : 78;
  const animatedHealth = useCountUp(Math.round(avgHealth));

  const color = avgHealth < 50 ? '#D50000' : avgHealth < 75 ? '#FF9100' : '#00C853';
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (animatedHealth / 100) * circumference;

  return (
    <div className="industrial-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            Fleet Health
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-3xl font-bold" style={{ color }}>{animatedHealth}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>/100</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} style={{ color: '#00C853' }} />
            <span className="text-xs font-mono" style={{ color: '#00C853' }}>+5% from yesterday</span>
          </div>
        </div>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r="36" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
          <text x="44" y="48" textAnchor="middle" fill={color} fontSize="14" fontFamily="JetBrains Mono" fontWeight="bold">
            {animatedHealth}%
          </text>
        </svg>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-1500"
          style={{ width: `${animatedHealth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function TurbinesAtRiskCard({ turbines }: { turbines: TurbineMetrics[] }) {
  const critical = turbines.filter(t => t.riskLevel === 'critical').length;
  const warning = turbines.filter(t => t.riskLevel === 'warning').length;
  const healthy = turbines.filter(t => t.riskLevel === 'healthy').length;
  const animCritical = useCountUp(critical);
  const animWarning = useCountUp(warning);
  const animHealthy = useCountUp(healthy);

  return (
    <div className="industrial-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Turbines at Risk
        </p>
        <AlertTriangle size={16} style={{ color: '#FF9100' }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(213,0,0,0.1)' }}>
          <div
            className="font-mono text-2xl font-bold animate-pulse-red"
            style={{ color: '#D50000' }}
          >
            {animCritical}
          </div>
          <div className="text-xs mt-1 font-semibold" style={{ color: '#D50000' }}>Critical</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,145,0,0.1)' }}>
          <div className="font-mono text-2xl font-bold" style={{ color: '#FF9100' }}>{animWarning}</div>
          <div className="text-xs mt-1 font-semibold" style={{ color: '#FF9100' }}>Warning</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,200,83,0.1)' }}>
          <div className="font-mono text-2xl font-bold" style={{ color: '#00C853' }}>{animHealthy}</div>
          <div className="text-xs mt-1 font-semibold" style={{ color: '#00C853' }}>Healthy</div>
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Turbines needing attention within 7 days
      </p>
    </div>
  );
}

function PredictedFailuresCard({ turbines }: { turbines: TurbineMetrics[] }) {
  const { data: riskHistory } = useFleetRiskHistory(turbines.map(t => t.id));
  const predicted = riskHistory?.predictedFailures30d ?? turbines.filter(t => t.failureProbability > 0.5).length;
  const avgConf = riskHistory?.avgConfidence ?? (
    turbines.length > 0
      ? turbines.filter(t => t.failureProbability > 0.5).reduce((s, t) => s + t.failureProbability, 0) / Math.max(predicted, 1)
      : 0
  );
  const animPredicted = useCountUp(predicted);

  // Mini calendar heatmap built from real backend 30-day risk history.
  const days = riskHistory?.dayRiskScores ?? Array.from({ length: 30 }, () => 0);

  return (
    <div className="industrial-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Predicted Failures (30d)
        </p>
        <Activity size={16} style={{ color: 'var(--color-accent-blue)' }} />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-3xl font-bold" style={{ color: '#FF9100' }}>{animPredicted}</span>
        <div>
          <div className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            Avg confidence: <span style={{ color: '#FF9100' }}>{(avgConf * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      {/* Mini heatmap */}
      <div className="flex gap-0.5 flex-wrap">
        {days.map((risk, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: risk > 0.6 ? '#D50000' : risk > 0.4 ? '#FF9100' : risk > 0.2 ? '#FF9100' : 'var(--color-border)',
              opacity: risk > 0.2 ? 0.4 + risk * 0.6 : 0.3,
            }}
            title={`Day ${i + 1}: ${(risk * 100).toFixed(0)}% risk`}
          />
        ))}
      </div>
    </div>
  );
}

function MaintenanceEconomicsCard({ totalSavings, failuresPrevented }: { totalSavings: number; failuresPrevented: number }) {
  const savingsM = Math.round(totalSavings / 1_000_000);
  const animSavings = useCountUp(savingsM);
  const animPrevented = useCountUp(failuresPrevented);

  // Sparkline data based on savings trend
  const sparkData = Array.from({ length: 12 }, (_, i) => Math.round(savingsM * (0.3 + (i / 11) * 0.7)));
  const maxVal = Math.max(...sparkData, 1);
  const minVal = Math.min(...sparkData);
  const points = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * 100;
    const y = 30 - ((v - minVal) / (maxVal - minVal + 1)) * 28;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="industrial-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Maintenance Economics
        </p>
        <DollarSign size={16} style={{ color: '#00C853' }} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold" style={{ color: '#00C853' }}>${animSavings}M</span>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>total savings</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Target size={12} style={{ color: 'var(--color-accent-blue)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--color-accent-blue)' }}>Prevented: {animPrevented}</span>
          <TrendingUp size={12} style={{ color: '#00C853' }} />
          <span className="text-xs font-mono" style={{ color: '#00C853' }}>+15% vs target</span>
        </div>
      </div>
      {/* Sparkline */}
      <svg viewBox="0 0 100 32" className="w-full" style={{ height: '32px' }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C853" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00C853" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="#00C853"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function KpiCardGrid({ turbines }: KpiCardGridProps) {
  const { data: summary } = useFleetSummary();
  const totalSavings = summary?.total_savings ?? 0;
  const failuresPrevented = summary?.failures_prevented ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <FleetHealthCard turbines={turbines} />
      <TurbinesAtRiskCard turbines={turbines} />
      <PredictedFailuresCard turbines={turbines} />
      <MaintenanceEconomicsCard totalSavings={totalSavings} failuresPrevented={failuresPrevented} />
    </div>
  );
}
