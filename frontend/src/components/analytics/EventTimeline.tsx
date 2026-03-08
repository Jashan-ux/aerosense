import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { HistoricalEvent } from '../../lib/mockData';

interface EventTimelineProps {
  events: HistoricalEvent[];
  allEvents: HistoricalEvent[];
  comparePeriods: boolean;
}

const EVENT_COLORS: Record<HistoricalEvent['type'], string> = {
  failure: '#D50000',
  predicted: '#FF9100',
  maintenance: '#2979FF',
  retraining: '#00C853',
};

const EVENT_LABELS: Record<HistoricalEvent['type'], string> = {
  failure: '🔴 Actual Failure',
  predicted: '🟡 Predicted Failure',
  maintenance: '🔵 Maintenance',
  retraining: '🟢 Model Retrain',
};

const TYPE_Y: Record<HistoricalEvent['type'], number> = {
  failure: 4,
  predicted: 3,
  maintenance: 2,
  retraining: 1,
};

export default function EventTimeline({ events, allEvents, comparePeriods }: EventTimelineProps) {
  const formatData = (evts: HistoricalEvent[]) =>
    evts.map(e => ({
      x: e.timestamp,
      y: TYPE_Y[e.type],
      type: e.type,
      turbineId: e.turbineId,
      description: e.description,
      color: EVENT_COLORS[e.type],
    }));

  const mainData = formatData(events);

  // Compare period: shift back by the same duration
  const compareData = comparePeriods ? (() => {
    if (events.length < 2) return [];
    const duration = events[events.length - 1].timestamp - events[0].timestamp;
    const compareEvents = allEvents.filter(e =>
      e.timestamp >= events[0].timestamp - duration && e.timestamp < events[0].timestamp
    );
    return formatData(compareEvents).map(d => ({ ...d, y: d.y + 0.3 }));
  })() : [];

  const minX = events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : Date.now() - 90 * 86400000;
  const maxX = events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : Date.now();

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Event Timeline
        </h3>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[type as HistoricalEvent['type']] }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>{label.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
          <XAxis
            type="number" dataKey="x" domain={[minX, maxX]}
            tickFormatter={formatDate}
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
            scale="time"
          />
          <YAxis
            type="number" dataKey="y" domain={[0, 5]}
            tickFormatter={(v) => {
              const map: Record<number, string> = { 1: 'Retrain', 2: 'Maint.', 3: 'Predict', 4: 'Failure' };
              return map[Math.round(v)] || '';
            }}
            tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg-card)', border: `1px solid ${d.color}` }}>
                  <p className="font-mono font-bold" style={{ color: d.color }}>{d.turbineId}</p>
                  <p style={{ color: 'var(--color-text-secondary)' }}>{d.description}</p>
                  <p className="font-mono mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(d.x)}</p>
                </div>
              );
            }}
          />
          <Scatter
            data={mainData}
            shape={(props: { cx?: number; cy?: number; payload?: { color: string } }) => {
              const { cx = 0, cy = 0, payload } = props;
              if (!payload) return <circle cx={cx} cy={cy} r={5} fill="#9CA3AF" />;
              return <circle cx={cx} cy={cy} r={5} fill={payload.color} fillOpacity={0.85} stroke={payload.color} strokeWidth={1} />;
            }}
            name="Events"
          />
          {comparePeriods && compareData.length > 0 && (
            <Scatter
              data={compareData}
              shape={(props: { cx?: number; cy?: number; payload?: { color: string } }) => {
                const { cx = 0, cy = 0, payload } = props;
                if (!payload) return <circle cx={cx} cy={cy} r={4} fill="#9CA3AF" />;
                return <circle cx={cx} cy={cy} r={4} fill="none" stroke={payload.color} strokeWidth={1.5} strokeDasharray="2 2" />;
              }}
              name="Compare Period"
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
