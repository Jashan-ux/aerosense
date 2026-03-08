import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend,
} from 'recharts';
import { Slider } from '../ui/slider';

const TP = 2847, FP = 4102, TN = 38291, FN = 0;
const precision = TP / (TP + FP);
const recall = TP / (TP + FN);

interface RocPoint {
  fpr: number;
  tpr: number;
  random: number;
}

interface PrPoint {
  recall: number;
  precision: number;
}

function generateRocCurve(): RocPoint[] {
  const points: RocPoint[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const fpr = t;
    const tpr = Math.min(1, Math.pow(t, 0.3) * 1.05);
    points.push({
      fpr: parseFloat(fpr.toFixed(3)),
      tpr: parseFloat(tpr.toFixed(3)),
      random: fpr,
    });
  }
  return points;
}

function generatePrCurve(): PrPoint[] {
  const points: PrPoint[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const rec = t;
    const prec = Math.max(0.1, 1 - t * 0.7 + Math.sin(t * 3) * 0.05);
    points.push({
      recall: parseFloat(rec.toFixed(3)),
      precision: parseFloat(prec.toFixed(3)),
    });
  }
  return points;
}

const ROC_DATA = generateRocCurve();
const PR_DATA = generatePrCurve();

export default function ModelValidationSection() {
  const [threshold, setThreshold] = useState([0.5]);
  const thresholdVal = threshold[0];

  const rocOpIdx = Math.round(thresholdVal * 20);
  const rocOp: RocPoint | undefined = ROC_DATA[Math.min(rocOpIdx, ROC_DATA.length - 1)];

  const prOpIdx = Math.round((1 - thresholdVal) * 20);
  const prOp: PrPoint | undefined = PR_DATA[Math.min(prOpIdx, PR_DATA.length - 1)];

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
    >
      <div>
        <h3 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Model Validation
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Last 30 days performance</p>
      </div>

      {/* Confusion Matrix */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Confusion Matrix
        </p>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { label: 'True Positive', value: TP, color: '#00C853', bg: 'rgba(0,200,83,0.1)' },
            { label: 'False Positive', value: FP, color: '#D50000', bg: 'rgba(213,0,0,0.1)' },
            { label: 'False Negative', value: FN, color: '#8B0000', bg: 'rgba(139,0,0,0.1)' },
            { label: 'True Negative', value: TN, color: '#00C853', bg: 'rgba(0,200,83,0.1)' },
          ].map((cell, i) => (
            <div key={i} className="rounded-lg p-3 text-center" style={{ backgroundColor: cell.bg }}>
              <div className="font-mono text-lg font-bold" style={{ color: cell.color }}>
                {cell.value.toLocaleString()}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{cell.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs">
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Precision: </span>
            <span className="font-mono font-bold" style={{ color: '#2979FF' }}>{(precision * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)' }}>Recall: </span>
            <span className="font-mono font-bold" style={{ color: '#00C853' }}>{(recall * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Threshold slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
            Decision Threshold
          </p>
          <span className="font-mono text-xs font-bold" style={{ color: '#2979FF' }}>{thresholdVal.toFixed(2)}</span>
        </div>
        <Slider
          value={threshold}
          onValueChange={setThreshold}
          min={0.1}
          max={0.9}
          step={0.05}
          className="w-full"
        />
      </div>

      {/* ROC Curve */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          ROC Curve{' '}
          <span className="font-mono normal-case" style={{ color: '#2979FF' }}>AUC = 0.89</span>
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={ROC_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
            <XAxis
              dataKey="fpr"
              tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
              label={{ value: 'FPR', position: 'insideBottom', offset: -2, fill: 'var(--color-text-secondary)', fontSize: 9 }}
            />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '10px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="tpr" stroke="#2979FF" strokeWidth={2} dot={false} name="Model (AUC=0.89)" />
            <Line type="monotone" dataKey="random" stroke="#9CA3AF" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Random" />
            {rocOp && (
              <ReferenceDot
                x={rocOp.fpr}
                y={rocOp.tpr}
                r={5}
                fill="#FF9100"
                stroke="white"
                strokeWidth={1.5}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PR Curve */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          PR Curve{' '}
          <span className="font-mono normal-case" style={{ color: '#00C853' }}>AUC = 0.66</span>
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={PR_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
            <XAxis
              dataKey="recall"
              tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }}
              label={{ value: 'Recall', position: 'insideBottom', offset: -2, fill: 'var(--color-text-secondary)', fontSize: 9 }}
            />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontFamily: 'JetBrains Mono' }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '10px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="precision" stroke="#00C853" strokeWidth={2} dot={false} name="Precision-Recall" />
            {prOp && (
              <ReferenceDot
                x={prOp.recall}
                y={prOp.precision}
                r={5}
                fill="#FF9100"
                stroke="white"
                strokeWidth={1.5}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
