import React, { useState } from 'react';
import { AlertCircle, Calendar, Search, X, ChevronDown, ChevronUp, Phone, Loader2 } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import type { TurbineMetrics } from '../../types';
import { getHealthColor, getTurbineRiskColor, SHAP_FEATURE_NAMES, SHAP_TRANSLATIONS } from '../../lib/mockData';
import { dispatchMaintenance } from '../../api';
import { toast } from 'sonner';

interface RiskPriorityQueueProps {
  turbines: TurbineMetrics[];
}

const PRIMARY_ISSUES: Record<string, string> = {
  '0': 'Gearbox Overheating',
  '10': 'Vibration Anomaly',
  '11': 'Drivetrain Deviation',
  '13': 'Power Efficiency Drop',
  '21': 'Phase Current Imbalance',
};

function PriorityCard({ turbine, onDismiss }: { turbine: TurbineMetrics; onDismiss: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const riskColor = getTurbineRiskColor(turbine.riskLevel);
  const healthColor = getHealthColor(turbine.healthScore);
  const issue = PRIMARY_ISSUES[turbine.id] || 'Anomaly Detected';

  const topShap = turbine.shapContributions
    .map((v, i) => ({ value: v, name: SHAP_FEATURE_NAMES[i], translation: SHAP_TRANSLATIONS[SHAP_FEATURE_NAMES[i]] }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const handleSchedule = async () => {
    if (scheduled || dispatching) return;
    setDispatching(true);
    try {
      const result = await dispatchMaintenance(turbine.id, issue);
      setScheduled(true);
      if (result.status === 'dispatched') {
        toast.success(`Maintenance dispatched for T-${turbine.id}`, {
          description: 'Twilio call initiated. Technician will be notified.',
        });
      } else {
        toast.warning(`Dispatch queued for T-${turbine.id}`, {
          description: 'n8n webhook unreachable — dispatch logged for retry.',
        });
      }
    } catch {
      toast.error(`Dispatch failed for T-${turbine.id}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div
      className="rounded-lg p-3 mb-3 transition-all duration-200"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: `1px solid ${riskColor}`,
        borderLeft: `4px solid ${riskColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {turbine.id}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
            style={{
              backgroundColor: `${riskColor}20`,
              color: riskColor,
              animation: turbine.riskLevel === 'critical' ? 'pulse-red 2s infinite' : undefined,
            }}
          >
            {turbine.riskLevel}
          </span>
        </div>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
          <X size={12} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Health</span>
          <div className="font-mono text-sm font-bold" style={{ color: healthColor }}>
            {(turbine.healthScore ?? 0).toFixed(0)}/100
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Failure Prob.</span>
          <div className="font-mono text-sm font-bold" style={{ color: riskColor }}>
            {((turbine.failureProbability ?? 0) * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Est. RUL</span>
          <div className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {(turbine.remainingUsefulLife ?? 0).toFixed(0)} days
          </div>
        </div>
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Issue</span>
          <div className="text-xs font-semibold" style={{ color: riskColor }}>{issue}</div>
        </div>
      </div>

      {/* SHAP insights toggle */}
      <button
        className="flex items-center gap-1 text-xs mb-2 transition-colors"
        style={{ color: 'var(--color-accent-blue)' }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        SHAP Insights
      </button>

      {expanded && (
        <div className="mb-2 space-y-1">
          {topShap.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span style={{ color: '#D50000' }}>•</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{s.translation}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          className="btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
          style={{ minHeight: '36px', opacity: scheduled ? 0.6 : 1 }}
          onClick={handleSchedule}
          disabled={scheduled || dispatching}
        >
          {dispatching ? <Loader2 size={11} className="animate-spin" /> : <Phone size={11} />}
          {dispatching ? 'Dispatching…' : scheduled ? 'Dispatched' : 'Schedule'}
        </button>
        <button
          className="btn-secondary text-xs py-1.5 px-3 flex-1"
          style={{ minHeight: '36px' }}
          onClick={() => navigate({ to: '/turbine/$id', params: { id: turbine.id } })}
        >
          <Search size={11} />
          Investigate
        </button>
      </div>
    </div>
  );
}

export default function RiskPriorityQueue({ turbines }: RiskPriorityQueueProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const priorityTurbines = turbines
    .filter(t => t.riskLevel !== 'healthy' && !dismissed.has(t.id))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, healthy: 2 };
      return (order[a.riskLevel as keyof typeof order] || 2) - (order[b.riskLevel as keyof typeof order] || 2);
    });

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-app)',
        border: '1px solid var(--color-border)',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 p-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <AlertCircle size={16} style={{ color: '#D50000' }} className="animate-pulse-red" />
        <div>
          <h3 className="font-montserrat font-700 text-sm" style={{ color: '#D50000' }}>
            ACTION REQUIRED
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Next 24 hours</p>
        </div>
        <span
          className="ml-auto font-mono text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(213,0,0,0.15)', color: '#D50000' }}
        >
          {priorityTurbines.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {priorityTurbines.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
            <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">All turbines dismissed</p>
          </div>
        ) : (
          priorityTurbines.map(turbine => (
            <PriorityCard
              key={turbine.id}
              turbine={turbine}
              onDismiss={() => handleDismiss(turbine.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
