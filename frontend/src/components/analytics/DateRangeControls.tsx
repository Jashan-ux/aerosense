import React from 'react';
import { GitCompare } from 'lucide-react';
import type { DateRange } from '../../pages/HistoricalAnalytics';
import { Switch } from '../ui/switch';

interface DateRangeControlsProps {
  preset: DateRange;
  onPresetChange: (p: DateRange) => void;
  comparePeriods: boolean;
  onComparePeriodsChange: (v: boolean) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

const PRESETS: { value: DateRange; label: string }[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: '1Y', label: '1Y' },
  { value: 'custom', label: 'Custom' },
];

export default function DateRangeControls({
  preset, onPresetChange, comparePeriods, onComparePeriodsChange,
  customStart, customEnd, onCustomStartChange, onCustomEndChange,
}: DateRangeControlsProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-wrap items-center gap-4"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.value}
            className="px-3 py-1.5 rounded-lg text-xs font-montserrat font-600 transition-all min-h-[36px]"
            style={{
              backgroundColor: preset === p.value ? 'var(--color-accent-blue)' : 'var(--color-bg-app)',
              color: preset === p.value ? 'white' : 'var(--color-text-secondary)',
              border: `1px solid ${preset === p.value ? 'var(--color-accent-blue)' : 'var(--color-border)'}`,
            }}
            onClick={() => onPresetChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={e => onCustomStartChange(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs font-mono outline-none"
            style={{
              backgroundColor: 'var(--color-bg-app)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>to</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => onCustomEndChange(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs font-mono outline-none"
            style={{
              backgroundColor: 'var(--color-bg-app)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      )}

      {/* Compare periods toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <GitCompare size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Compare Periods</span>
        <Switch
          checked={comparePeriods}
          onCheckedChange={onComparePeriodsChange}
        />
      </div>
    </div>
  );
}
