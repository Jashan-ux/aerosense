import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCountUp } from '../../hooks/useCountUp';
import { useGetFleetMetrics } from '../../hooks/useQueries';

function SavingsCard({ totalSavings }: { totalSavings: number }) {
  const savingsM = Math.round(totalSavings / 1_000_000);
  const quarterly = Math.round(savingsM * 0.28);
  const monthly = Math.round(savingsM * 0.09);
  const animYtd = useCountUp(savingsM);
  const animQ = useCountUp(quarterly);
  const animM = useCountUp(monthly);

  return (
    <div className="industrial-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Savings Realized
        </p>
        <DollarSign size={16} style={{ color: '#00C853' }} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>This Month</span>
          <span className="font-mono font-bold text-sm" style={{ color: '#00C853' }}>${animM}M</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>This Quarter</span>
          <span className="font-mono font-bold text-sm" style={{ color: '#00C853' }}>${animQ}M</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>YTD</span>
          <span className="font-mono font-bold text-xl" style={{ color: '#00C853' }}>${animYtd}M</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp size={12} style={{ color: '#00C853' }} />
          <span className="text-xs font-mono" style={{ color: '#00C853' }}>+15% vs target</span>
        </div>
      </div>
    </div>
  );
}

function CostAvoidanceCard({ costAvoidance, failuresPrevented }: { costAvoidance: number; failuresPrevented: number }) {
  const animPrevented = useCountUp(failuresPrevented);

  const DONUT_DATA = [
    { name: 'Gearbox', value: Math.round(costAvoidance * 0.32 / 1_000_000), color: '#2979FF' },
    { name: 'Blade', value: Math.round(costAvoidance * 0.24 / 1_000_000), color: '#00C853' },
    { name: 'Generator', value: Math.round(costAvoidance * 0.18 / 1_000_000), color: '#FF9100' },
    { name: 'Other', value: Math.round(costAvoidance * 0.26 / 1_000_000), color: '#9CA3AF' },
  ];

  return (
    <div className="industrial-card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Cost Avoidance
        </p>
        <span className="text-xs font-mono font-bold" style={{ color: '#2979FF' }}>{animPrevented.toLocaleString()} failures prevented</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie data={DONUT_DATA} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
            {DONUT_DATA.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}
            formatter={(v: number) => [`$${v}M`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {DONUT_DATA.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{d.name}: <span className="font-mono font-bold" style={{ color: d.color }}>${d.value}M</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FalseAlarmCard({ falseAlarmCosts }: { falseAlarmCosts: number }) {
  const costM = Math.round(falseAlarmCosts / 1_000_000);
  const alarms = Math.round(falseAlarmCosts / 2000); // $2000 per alarm
  const animAlarms = useCountUp(alarms);
  const animCost = useCountUp(costM);

  return (
    <div className="industrial-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          False Alarm Cost
        </p>
        <AlertTriangle size={16} style={{ color: '#FF9100' }} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total Alarms</span>
          <span className="font-mono font-bold text-sm" style={{ color: '#FF9100' }}>{animAlarms.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Cost Incurred</span>
          <span className="font-mono font-bold text-xl" style={{ color: '#FF9100' }}>${animCost}M</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Cost per Alarm</span>
          <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>$2,000</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <TrendingDown size={12} style={{ color: '#00C853' }} />
          <span className="text-xs font-mono" style={{ color: '#00C853' }}>↓5% last month</span>
        </div>
      </div>
    </div>
  );
}

function RoiCard({ roi, netSavings }: { roi: number; netSavings: number }) {
  const netM = Math.round(netSavings / 1_000_000);
  const animRoi = useCountUp(Math.round(roi));
  const animNet = useCountUp(netM);

  return (
    <div className="industrial-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-montserrat font-600 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          ROI Metrics
        </p>
        <Target size={16} style={{ color: '#2979FF' }} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Net Savings</span>
          <span className="font-mono font-bold text-sm" style={{ color: '#00C853' }}>${animNet}M</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>ROI</span>
          <span className="font-mono font-bold text-xl" style={{ color: '#2979FF' }}>{animRoi.toLocaleString()}%</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Payback Period</span>
          <span className="font-mono font-bold text-sm" style={{ color: '#00C853' }}>3 days</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,200,83,0.15)', color: '#00C853' }}>
            Top 1% Industry
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FinancialMetricCards() {
  const { data: metrics } = useGetFleetMetrics();

  const totalSavings = metrics?.totalSavings ?? 0;
  const costAvoidance = metrics?.costAvoidance ?? 0;
  const falseAlarmCosts = metrics?.falseAlarmCosts ?? 0;
  const roi = metrics?.roi ?? 0;
  const failuresPrevented = (metrics?.confusionMatrix?.truePositive ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <SavingsCard totalSavings={totalSavings} />
      <CostAvoidanceCard costAvoidance={costAvoidance} failuresPrevented={failuresPrevented} />
      <FalseAlarmCard falseAlarmCosts={falseAlarmCosts} />
      <RoiCard roi={roi} netSavings={costAvoidance} />
    </div>
  );
}

