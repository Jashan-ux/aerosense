import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, Wrench, Package, Calendar, Phone, Loader2 } from 'lucide-react';
import type { TurbineMetrics } from '../../types';
import { dispatchMaintenance } from '../../api';
import { toast } from 'sonner';

interface MaintenanceRecommendationsPanelProps {
  turbine: TurbineMetrics;
}

const PRIMARY_ISSUES: Record<string, string> = {
  '0': 'Gearbox Overheating',
  '10': 'Vibration Anomaly',
  '11': 'Drivetrain Deviation',
  '13': 'Power Efficiency Drop',
  '21': 'Phase Current Imbalance',
};

const PRIORITY_GROUPS = [
  {
    priority: 1,
    label: 'Within 24 Hours',
    color: '#D50000',
    bgColor: 'rgba(213,0,0,0.08)',
    actions: [
      'Inspect gearbox — temperature anomaly detected',
      'Check lubricant levels and oil quality',
      'Listen for unusual bearing noise',
    ],
    estimatedTime: '3 hours',
  },
  {
    priority: 2,
    label: 'Within 7 Days',
    color: '#FF9100',
    bgColor: 'rgba(255,145,0,0.08)',
    actions: [
      'Schedule vibration analysis',
      'Inspect coupling alignment',
      'Review oil sample results',
    ],
    estimatedTime: '2 hours',
  },
  {
    priority: 3,
    label: 'Next Scheduled Maintenance',
    color: '#2979FF',
    bgColor: 'rgba(41,121,255,0.08)',
    actions: [
      'Plan gearbox oil change',
      'Inspect cooling system',
      'Calibrate temperature sensors',
    ],
    estimatedTime: '4 hours',
    dueIn: '14 days',
  },
];

const REQUIRED_PARTS = [
  { name: 'Gearbox oil (20L)', status: 'In Stock', color: '#00C853' },
  { name: 'Filters (2x)', status: 'Order Needed', color: '#FF9100' },
  { name: 'Temperature sensor', status: 'Available', color: '#2979FF' },
];

export default function MaintenanceRecommendationsPanel({ turbine }: MaintenanceRecommendationsPanelProps) {
  const [scheduled, setScheduled] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const autoDispatchedRef = useRef<string | null>(null);

  const fault = PRIMARY_ISSUES[turbine.id] || 'Anomaly Detected';

  const handleSchedule = async () => {
    if (scheduled || dispatching) return;
    setDispatching(true);
    try {
      const result = await dispatchMaintenance(turbine.id, fault);
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

  // Auto-dispatch when RUL drops to 7 days or below
  useEffect(() => {
    const rul = turbine.remainingUsefulLife ?? Infinity;
    const key = `${turbine.id}`;
    if (rul <= 7 && !scheduled && autoDispatchedRef.current !== key) {
      autoDispatchedRef.current = key;
      toast.info(`RUL ≤ 7 days for T-${turbine.id} — auto-dispatching maintenance`, {
        description: `Remaining useful life: ${rul.toFixed(0)} days`,
      });
      handleSchedule();
    }
  }, [turbine.id, turbine.remainingUsefulLife, scheduled]);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={16} style={{ color: 'var(--color-accent-blue)' }} />
          <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Maintenance Recommendations
          </h3>
        </div>
        <button
          className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          style={{ minHeight: '36px', opacity: scheduled ? 0.6 : 1 }}
          onClick={handleSchedule}
          disabled={scheduled || dispatching}
        >
          {dispatching ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
          {dispatching ? 'Dispatching…' : scheduled ? 'Dispatched ✓' : 'Schedule Now'}
        </button>
      </div>

      {/* Priority groups */}
      <div className="space-y-3">
        {PRIORITY_GROUPS.map(group => (
          <div
            key={group.priority}
            className="rounded-lg p-3"
            style={{ backgroundColor: group.bgColor, border: `1px solid ${group.color}30` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${group.color}20`, color: group.color }}
                >
                  P{group.priority}
                </span>
                <span className="text-xs font-montserrat font-600" style={{ color: group.color }}>
                  {group.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <Clock size={10} />
                <span className="font-mono">{group.estimatedTime}</span>
                {group.dueIn && <span className="ml-1">• Due in {group.dueIn}</span>}
              </div>
            </div>
            <ul className="space-y-1">
              {group.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>
                  <CheckCircle size={10} className="mt-0.5 flex-shrink-0" style={{ color: group.color }} />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Required parts */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package size={14} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-xs font-montserrat font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Required Parts
          </span>
        </div>
        <div className="space-y-1.5">
          {REQUIRED_PARTS.map((part, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-text-primary)' }}>{part.name}</span>
              <span
                className="font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${part.color}15`, color: part.color }}
              >
                {part.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
