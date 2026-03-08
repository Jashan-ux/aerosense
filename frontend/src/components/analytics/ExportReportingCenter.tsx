import React, { useState } from 'react';
import { Download, FileText, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateExecutiveSummary,
  generateMaintenancePlan,
  generatePerformanceReview,
  generateFleetHealthReport,
  generateRawDataExport,
  generateShapExport,
} from '../../utils/reportGenerators';
import { downloadFile } from '../../utils/fileDownload';

interface ReportType {
  id: string;
  name: string;
  description: string;
  format: string;
  generator: () => string;
  filename: string;
  mimeType: string;
}

const REPORTS: ReportType[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: '1-page overview with key metrics, fleet status, and financial performance.',
    format: 'TXT',
    generator: generateExecutiveSummary,
    filename: `executive-summary-${new Date().toISOString().slice(0, 10)}.txt`,
    mimeType: 'text/plain',
  },
  {
    id: 'maintenance',
    name: 'Weekly Maintenance Plan',
    description: 'Turbines scheduled for maintenance with estimated duration and required parts.',
    format: 'CSV',
    generator: generateMaintenancePlan,
    filename: `maintenance-plan-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  },
  {
    id: 'performance',
    name: 'Monthly Performance Review',
    description: 'KPIs with trend analysis, top achievements, and improvement opportunities.',
    format: 'CSV',
    generator: generatePerformanceReview,
    filename: `performance-review-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  },
  {
    id: 'fleet',
    name: 'Annual Fleet Health Report',
    description: 'Comprehensive fleet analysis with all sensor readings and health metrics.',
    format: 'CSV',
    generator: generateFleetHealthReport,
    filename: `fleet-health-report-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  },
  {
    id: 'raw',
    name: 'Raw Sensor Data Export',
    description: 'Complete sensor time-series data for all 22 turbines with all fields.',
    format: 'CSV',
    generator: generateRawDataExport,
    filename: `raw-sensor-data-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  },
  {
    id: 'shap',
    name: 'SHAP Values Export',
    description: 'Feature contribution values for all turbines for model interpretability.',
    format: 'CSV',
    generator: generateShapExport,
    filename: `shap-values-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  },
];

const FORMAT_COLORS: Record<string, string> = {
  CSV: '#00C853',
  TXT: '#2979FF',
  JSON: '#FF9100',
};

export default function ExportReportingCenter() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const handleGenerate = async (report: ReportType) => {
    setLoading(prev => ({ ...prev, [report.id]: true }));
    setDone(prev => ({ ...prev, [report.id]: false }));

    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      const content = report.generator();
      downloadFile(content, report.filename, report.mimeType);
      setDone(prev => ({ ...prev, [report.id]: true }));
      toast.success(`${report.name} downloaded`, {
        description: `File saved as ${report.filename}`,
      });
      // Reset done state after 3s
      setTimeout(() => setDone(prev => ({ ...prev, [report.id]: false })), 3000);
    } catch {
      toast.error('Export failed', { description: 'Please try again.' });
    } finally {
      setLoading(prev => ({ ...prev, [report.id]: false }));
    }
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Download size={16} style={{ color: 'var(--color-accent-blue)' }} />
        <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Export & Reporting Center
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {REPORTS.map(report => {
          const isLoading = loading[report.id];
          const isDone = done[report.id];
          const fmtColor = FORMAT_COLORS[report.format] || '#9CA3AF';

          return (
            <div
              key={report.id}
              className="rounded-lg p-4 flex flex-col gap-3 transition-all duration-200"
              style={{
                backgroundColor: 'var(--color-bg-app)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} style={{ color: fmtColor }} />
                  <span className="font-montserrat font-600 text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    {report.name}
                  </span>
                </div>
                <span
                  className="text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ backgroundColor: `${fmtColor}20`, color: fmtColor }}
                >
                  {report.format}
                </span>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {report.description}
              </p>

              <button
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-montserrat font-600 transition-all min-h-[36px]"
                style={{
                  backgroundColor: isDone ? 'rgba(0,200,83,0.15)' : 'rgba(41,121,255,0.15)',
                  color: isDone ? '#00C853' : 'var(--color-accent-blue)',
                  border: `1px solid ${isDone ? '#00C85330' : 'rgba(41,121,255,0.3)'}`,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.8 : 1,
                }}
                onClick={() => !isLoading && handleGenerate(report)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating...
                  </>
                ) : isDone ? (
                  <>
                    <CheckCircle size={12} />
                    Downloaded ✓
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
