import React from 'react';
import { Clock, TrendingDown, DollarSign } from 'lucide-react';

interface RulCardProps {
  rul: number;
  confidence: number;
  replacementCost: string;
  degradationRate: string;
}

export default function RulCard({ rul, confidence, replacementCost, degradationRate }: RulCardProps) {
  const color = rul < 30 ? '#D50000' : rul < 90 ? '#FF9100' : '#00C853';

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--color-bg-card)', border: `1px solid ${color}40` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} style={{ color }} />
        <h4 className="font-montserrat font-700 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Remaining Useful Life
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>RUL Estimate</p>
          <p className="font-mono text-2xl font-bold mt-0.5" style={{ color }}>{rul} days</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Confidence</p>
          <p className="font-mono text-2xl font-bold mt-0.5" style={{ color: '#2979FF' }}>{confidence}%</p>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} style={{ color: '#FF9100' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Replacement Cost</p>
            <p className="font-mono text-sm font-bold" style={{ color: '#FF9100' }}>{replacementCost}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown size={12} style={{ color: '#D50000' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Degradation</p>
            <p className="font-mono text-sm font-bold" style={{ color: '#D50000' }}>{degradationRate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
