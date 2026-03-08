import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import type { HistoricalEvent } from '../../lib/mockData';

interface EventSummaryPanelProps {
  events: HistoricalEvent[];
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const animated = useCountUp(value);
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--color-bg-card)', border: `1px solid ${color}30` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-montserrat font-600 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      <span className="font-mono text-2xl font-bold" style={{ color }}>{animated}</span>
    </div>
  );
}

export default function EventSummaryPanel({ events }: EventSummaryPanelProps) {
  const failures = events.filter(e => e.type === 'failure').length;
  const predicted = events.filter(e => e.type === 'predicted').length;
  const maintenance = events.filter(e => e.type === 'maintenance').length;
  const retraining = events.filter(e => e.type === 'retraining').length;

  return (
    <div>
      <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Event Summary — Selected Period
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Actual Failures" value={failures} color="#D50000" icon="🔴" />
        <StatCard label="Predicted Failures" value={predicted} color="#FF9100" icon="🟡" />
        <StatCard label="Maintenance Events" value={maintenance} color="#2979FF" icon="🔵" />
        <StatCard label="Model Retraining" value={retraining} color="#00C853" icon="🟢" />
      </div>
    </div>
  );
}
