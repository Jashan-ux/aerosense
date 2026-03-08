import React from 'react';
import SensorCard, { type SensorStatus } from './SensorCard';
import type { TurbineMetrics } from '../../types';

interface SensorGridProps {
  turbine: TurbineMetrics;
}

function getStatus(value: number, threshold: number, higherIsBad: boolean): SensorStatus {
  const ratio = higherIsBad ? value / threshold : threshold / value;
  if (ratio > 1.2) return 'CRITICAL';
  if (ratio > 1.05) return 'WARNING';
  if (ratio > 0.9) return 'MONITOR';
  return 'NORMAL';
}

function buildSparkData(readings: TurbineMetrics['sensorReadings'], key: keyof typeof readings[0]): number[] {
  return readings.slice(-12).map(r => r[key] as number);
}

export default function SensorGrid({ turbine }: SensorGridProps) {
  const latest = turbine.sensorReadings[turbine.sensorReadings.length - 1];
  const readings = turbine.sensorReadings;

  if (!latest) return null;

  // Baselines derived from actual DB statistics:
  //   gearbox_temp (sensor_9_avg):    25-66, avg ~40
  //   generator_temp (sensor_41_avg): 20-55, avg ~38
  //   wind_speed (wind_speed_3_avg):  0.4-26.6, avg ~6.2
  //   vibration (temp_spread/100):    0.18-16.7, avg ~10.6
  //   rpm (derived from power):       800-1600, typical ~1000
  //   power_output (power_30_avg):    0-0.98, avg ~0.27 (normalized)
  //   power_efficiency:               -0.01-0.095, avg ~0.03
  //   reactive_ratio (sensor_43_avg): 15-51, avg ~30
  //   current_std (sensor_8_avg):     13-149, avg ~80

  const sensors = [
    {
      label: 'Gearbox Temp',
      current: latest.gearboxTemp,
      baseline: 40,
      unit: '°C',
      status: getStatus(latest.gearboxTemp, 55, true),
      trend: (latest.gearboxTemp > 55 ? 'up' : latest.gearboxTemp < 30 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'gearboxTemp'),
      componentType: 'gearbox',
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      label: 'Generator Temp',
      current: latest.generatorTemp,
      baseline: 38,
      unit: '°C',
      status: getStatus(latest.generatorTemp, 48, true),
      trend: (latest.generatorTemp > 48 ? 'up' : latest.generatorTemp < 25 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'generatorTemp'),
      componentType: 'generator',
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      label: 'Wind Speed',
      current: latest.windSpeed,
      baseline: 6.2,
      unit: ' m/s',
      status: (latest.windSpeed > 20 ? 'CRITICAL' : latest.windSpeed > 15 ? 'WARNING' : 'NORMAL') as SensorStatus,
      trend: (latest.windSpeed > 12 ? 'up' : latest.windSpeed < 3 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'windSpeed'),
      componentType: 'blade',
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      label: 'Vibration Index',
      current: latest.vibration,
      baseline: 10.6,
      unit: '',
      status: getStatus(latest.vibration, 14, true),
      trend: (latest.vibration > 14 ? 'up' : latest.vibration < 5 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'vibration'),
      componentType: 'blade',
      formatValue: (v: number) => v.toFixed(2),
    },
    {
      label: 'Generator RPM',
      current: latest.rpm,
      baseline: 1000,
      unit: ' RPM',
      status: getStatus(Math.abs(latest.rpm - 1000), 200, true),
      trend: (latest.rpm > 1200 ? 'up' : latest.rpm < 900 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'rpm'),
      componentType: 'generator',
      formatValue: (v: number) => v.toFixed(0),
    },
    {
      label: 'Power Output',
      current: (latest.powerOutput ?? 0) * 100,
      baseline: 27,
      unit: '%',
      status: ((latest.powerOutput ?? 0) < 0.05 ? 'WARNING' : 'NORMAL') as SensorStatus,
      trend: ((latest.powerOutput ?? 0) < 0.1 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'powerOutput').map(v => (v ?? 0) * 100),
      componentType: 'generator',
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      label: 'Power Efficiency',
      current: (latest.powerEfficiency ?? 0) * 100,
      baseline: 2.9,
      unit: '%',
      status: ((latest.powerEfficiency ?? 0) > 0.07 ? 'WARNING' : 'NORMAL') as SensorStatus,
      trend: ((latest.powerEfficiency ?? 0) > 0.07 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'powerEfficiency').map(v => (v ?? 0) * 100),
      componentType: 'generator',
      formatValue: (v: number) => v.toFixed(2),
    },
    {
      label: 'Nacelle Temp',
      current: latest.reactivePowerRatio,
      baseline: 30,
      unit: '°C',
      status: getStatus(latest.reactivePowerRatio, 45, true),
      trend: (latest.reactivePowerRatio > 42 ? 'up' : latest.reactivePowerRatio < 20 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: buildSparkData(readings, 'reactivePowerRatio'),
      componentType: 'generator',
      formatValue: (v: number) => v.toFixed(1),
    },
    {
      label: 'Overall Health',
      current: turbine.healthScore,
      baseline: 80,
      unit: '/100',
      status: (turbine.healthScore < 50 ? 'CRITICAL' : turbine.healthScore < 75 ? 'WARNING' : 'NORMAL') as SensorStatus,
      trend: (turbine.healthScore < 60 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
      sparkData: readings.slice(-12).map(r => (r as any).health_score ?? turbine.healthScore),
      componentType: 'gearbox',
      formatValue: (v: number) => v.toFixed(0),
    },
  ];

  return (
    <div>
      <h3 className="font-montserrat font-700 text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Real-Time Sensor Dashboard
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sensors.map((s, i) => (
          <SensorCard key={i} {...s} />
        ))}
      </div>
    </div>
  );
}
