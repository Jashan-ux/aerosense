import React, { useState, useMemo } from 'react';
import { HISTORICAL_EVENTS, type HistoricalEvent } from '../lib/mockData';
import EventTimeline from '../components/analytics/EventTimeline';
import DateRangeControls from '../components/analytics/DateRangeControls';
import EventSummaryPanel from '../components/analytics/EventSummaryPanel';
import ExportReportingCenter from '../components/analytics/ExportReportingCenter';

export type DateRange = '7D' | '30D' | '90D' | '1Y' | 'custom';

export default function HistoricalAnalytics() {
  const [preset, setPreset] = useState<DateRange>('90D');
  const [comparePeriods, setComparePeriods] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredEvents = useMemo((): HistoricalEvent[] => {
    const now = Date.now();
    let startMs: number;

    if (preset === 'custom' && customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).getTime();
      return HISTORICAL_EVENTS.filter(e => e.timestamp >= start && e.timestamp <= end);
    }

    switch (preset) {
      case '7D': startMs = now - 7 * 24 * 3600 * 1000; break;
      case '30D': startMs = now - 30 * 24 * 3600 * 1000; break;
      case '90D': startMs = now - 90 * 24 * 3600 * 1000; break;
      default: startMs = now - 365 * 24 * 3600 * 1000;
    }

    return HISTORICAL_EVENTS.filter(e => e.timestamp >= startMs);
  }, [preset, customStart, customEnd]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-montserrat font-800 text-xl" style={{ color: 'var(--color-text-primary)' }}>
          Historical Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          12-month event timeline & trend analysis
        </p>
      </div>

      <DateRangeControls
        preset={preset}
        onPresetChange={setPreset}
        comparePeriods={comparePeriods}
        onComparePeriodsChange={setComparePeriods}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />

      <EventTimeline events={filteredEvents} allEvents={HISTORICAL_EVENTS} comparePeriods={comparePeriods} />
      <EventSummaryPanel events={filteredEvents} />
      <ExportReportingCenter />
    </div>
  );
}
