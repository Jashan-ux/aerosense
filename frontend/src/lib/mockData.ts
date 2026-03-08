import type { TurbineMetrics, SensorReading, FleetMetrics } from '../types';

export interface HistoricalEvent {
  type: 'failure' | 'predicted' | 'maintenance' | 'retraining';
  timestamp: number;
  turbineId: string;
  description: string;
}

// Real asset IDs from the wind farm (5 turbines with model data)
export const ASSET_IDS = [0, 10, 11, 13, 21];

// Generate deterministic mock sensor readings for a turbine
export function generateSensorReadings(turbineIndex: number, count: number = 30): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const baseGearboxTemp = 60 + (turbineIndex % 5) * 4;
  const baseRpm = 1480 + (turbineIndex % 3) * 10;
  const basePowerEff = 0.88 + (turbineIndex % 4) * 0.02;
  const baseVibration = 1.2 + (turbineIndex % 5) * 0.2;

  for (let i = count - 1; i >= 0; i--) {
    const t = i / count;
    const degradation = turbineIndex < 3 ? t * 0.3 : 0;
    const noise = Math.sin(i * 2.3) * 0.05;

    readings.push({
      timestamp: now - i * dayMs,
      gearboxTemp: baseGearboxTemp + degradation * 20 + noise * 10,
      generatorTemp: baseGearboxTemp + 5 + degradation * 15 + noise * 8,
      windSpeed: 12 + noise * 2,
      rpm: baseRpm - degradation * 50 + noise * 20,
      powerOutput: 0.27 + noise * 0.1,
      powerEfficiency: basePowerEff - degradation * 0.15 + noise * 0.02,
      vibration: baseVibration + degradation * 1.5 + noise * 0.3,
      phaseCurrent: 490 + (turbineIndex % 3) * 5 + noise * 10,
      drivetrainRatio: 99.5 - degradation * 2 + noise * 0.5,
      turbulenceIntensity: 0.12 + degradation * 0.08 + noise * 0.02,
      reactivePowerRatio: 0.15 + degradation * 0.1 + noise * 0.02,
    });
  }
  return readings;
}

export function generateShapContributions(turbineIndex: number): number[] {
  const base = turbineIndex < 2 ? 0.6 : turbineIndex < 4 ? 0.3 : 0.1;
  return [
    base * 0.35,
    base * 0.20,
    -base * 0.15,
    base * 0.12,
    base * 0.08,
    base * 0.06,
    -base * 0.04,
    base * 0.03,
    base * 0.02,
    -base * 0.01,
  ];
}

export function generateMockTurbines(): TurbineMetrics[] {
  const configs = [
    { id: '0', health: 42, risk: 'critical', failProb: 0.82, rul: 12 },
    { id: '10', health: 58, risk: 'warning', failProb: 0.52, rul: 28 },
    { id: '11', health: 38, risk: 'critical', failProb: 0.78, rul: 8 },
    { id: '13', health: 62, risk: 'warning', failProb: 0.48, rul: 35 },
    { id: '21', health: 88, risk: 'healthy', failProb: 0.08, rul: 145 },
  ];

  return configs.map((config, index) => ({
    id: config.id,
    healthScore: config.health,
    riskLevel: config.risk,
    failureProbability: config.failProb,
    remainingUsefulLife: config.rul,
    sensorReadings: generateSensorReadings(index),
    shapContributions: generateShapContributions(index),
    maintenanceEvents: [],
  }));
}

export const MOCK_TURBINES = generateMockTurbines();

export const MOCK_FLEET_METRICS: FleetMetrics = {
  totalSavings: 3700000000,
  costAvoidance: 3700000000,
  falseAlarmCosts: 226800000,
  roi: 52757,
  confusionMatrix: {
    truePositive: 2847,
    falsePositive: 4102,
    trueNegative: 38291,
    falseNegative: 0,
  },
  rocAuc: 0.89,
  prAuc: 0.66,
};

export const SHAP_FEATURE_NAMES = [
  'gearbox_delta_mean_24h',
  'drivetrain_ratio_std_24h',
  'power_efficiency',
  'turbulence_mean_3h',
  'current_std_lag_1',
  'vibration_trend',
  'rpm_stability',
  'reactive_power_spike',
  'ambient_temp_effect',
  'maintenance_recency',
];

export const SHAP_TRANSLATIONS: Record<string, string> = {
  'gearbox_delta_mean_24h': 'Gearbox is running hotter than normal',
  'drivetrain_ratio_std_24h': 'Drivetrain ratio fluctuating unusually',
  'power_efficiency': 'Power efficiency has dropped significantly',
  'turbulence_mean_3h': 'Turbulence increased, causing mechanical stress',
  'current_std_lag_1': 'Phase current imbalance detected',
  'vibration_trend': 'Vibration levels trending upward',
  'rpm_stability': 'RPM stability within normal range',
  'reactive_power_spike': 'Reactive power spike detected',
  'ambient_temp_effect': 'Ambient temperature impact minimal',
  'maintenance_recency': 'Recent maintenance reduces risk',
};

export function getTurbineRiskColor(riskLevel: string | undefined | null): string {
  switch ((riskLevel || 'healthy').toLowerCase()) {
    case 'critical': return '#D50000';
    case 'warning': return '#FF9100';
    default: return '#00C853';
  }
}

export function getHealthColor(score: number | undefined | null): string {
  const s = score ?? 0;
  if (s < 50) return '#D50000';
  if (s < 75) return '#FF9100';
  return '#00C853';
}

export function formatCurrency(value: number | undefined | null): string {
  const v = value ?? 0;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function generateHistoricalEvents(): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];
  const now = Date.now();
  const monthMs = 30 * 24 * 60 * 60 * 1000;

  for (let m = 11; m >= 0; m--) {
    const monthStart = now - m * monthMs;
    if (m % 3 === 0) {
      events.push({ type: 'failure', timestamp: monthStart + Math.random() * monthMs, turbineId: String(ASSET_IDS[m % ASSET_IDS.length]), description: 'Gearbox failure detected' });
    }
    events.push({ type: 'predicted', timestamp: monthStart + Math.random() * monthMs, turbineId: String(ASSET_IDS[(m + 1) % ASSET_IDS.length]), description: 'Failure predicted within 14 days' });
    events.push({ type: 'maintenance', timestamp: monthStart + Math.random() * monthMs, turbineId: String(ASSET_IDS[m % ASSET_IDS.length]), description: 'Scheduled maintenance completed' });
    if (m % 2 === 0) {
      events.push({ type: 'retraining', timestamp: monthStart + Math.random() * monthMs, turbineId: 'FLEET', description: 'Model retrained with new data' });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export const HISTORICAL_EVENTS = generateHistoricalEvents();

// Wind farm layout positions (SVG fallback — not used by 3D map)
export const TURBINE_POSITIONS: Record<string, { x: number; y: number }> = {
  '0': { x: 120, y: 120 },
  '10': { x: 280, y: 120 },
  '11': { x: 440, y: 120 },
  '13': { x: 200, y: 280 },
  '21': { x: 380, y: 280 },
};
