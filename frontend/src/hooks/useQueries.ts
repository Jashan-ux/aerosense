import { useQuery } from '@tanstack/react-query';
import type { TurbineMetrics, FleetMetrics, TurbinePrediction, FleetSummary, BusinessMetricsResponse, ShapResponse, TurbineHistoryResponse } from '../types';
import { fetchFleetCurrent, fetchTurbine, fetchFleetSummary, fetchBusinessMetrics, fetchTurbineShap, fetchTurbineHistory } from '../api';

// Refresh interval for live updates (10 seconds)
const REFETCH_INTERVAL = 10_000;

export interface FleetRiskHistory {
  dayRiskScores: number[];
  predictedFailures30d: number;
  avgConfidence: number;
}

// Map API prediction to frontend TurbineMetrics shape
function predictionToTurbineMetrics(p: TurbinePrediction): TurbineMetrics {
  const healthScore = p.health_score;
  let riskLevel = 'healthy';
  if (healthScore < 50) riskLevel = 'critical';
  else if (healthScore < 80) riskLevel = 'warning';

  // Build sensorReadings from recent_readings window (30 data points)
  // or fall back to single current reading
  const recentReadings: any[] = (p as any).recent_readings || [];
  const sensorReadings = recentReadings.length > 0
    ? recentReadings.map((r: any) => ({
      timestamp: new Date(r.timestamp).getTime(),
      gearboxTemp: r.sensors?.gearbox_temp ?? 0,
      generatorTemp: r.sensors?.generator_temp ?? 0,
      windSpeed: r.sensors?.wind_speed ?? 0,
      rpm: r.sensors?.rpm ?? 0,
      powerOutput: r.sensors?.power_output ?? 0,
      powerEfficiency: r.sensors?.drivetrain_ratio ?? 0,
      vibration: r.sensors?.vibration ?? 0,
      phaseCurrent: r.sensors?.current_std ?? 0,
      drivetrainRatio: r.sensors?.drivetrain_ratio ?? 0,
      turbulenceIntensity: r.sensors?.vibration ?? 0,
      reactivePowerRatio: r.sensors?.reactive_ratio ?? 0,
      // Real ML output values for per-point chart data
      health_score: r.health_score,
      failure_probability: r.failure_probability,
      predicted_rul: r.predicted_rul,
    }))
    : [{
      timestamp: new Date(p.timestamp).getTime(),
      gearboxTemp: p.sensors.gearbox_temp,
      generatorTemp: p.sensors.generator_temp,
      windSpeed: p.sensors.wind_speed,
      rpm: p.sensors.rpm,
      powerOutput: p.sensors.power_output,
      powerEfficiency: (p.sensors as any).drivetrain_ratio ?? 0,
      vibration: p.sensors.vibration,
      phaseCurrent: (p.sensors as any).current_std ?? 0,
      drivetrainRatio: (p.sensors as any).drivetrain_ratio ?? 0,
      turbulenceIntensity: p.sensors.vibration,
      reactivePowerRatio: (p.sensors as any).reactive_ratio ?? 0,
    }];

  return {
    id: String(p.asset_id),
    healthScore: healthScore ?? 0,
    riskLevel,
    failureProbability: p.failure_probability ?? 0,
    remainingUsefulLife: p.predicted_rul ?? 0,
    sensorReadings,
    shapContributions: [],
    maintenanceEvents: [],
  };
}

export function useGetAllTurbines() {
  return useQuery<TurbineMetrics[]>({
    queryKey: ['turbines'],
    queryFn: async () => {
      const predictions: TurbinePrediction[] = await fetchFleetCurrent();
      if (predictions && predictions.length > 0) {
        return predictions.map(p => predictionToTurbineMetrics(p));
      }
      return [];
    },
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useGetTurbine(id: string) {
  const numericId = parseInt(id, 10);
  return useQuery<TurbineMetrics>({
    queryKey: ['turbine', id],
    queryFn: async () => {
      const prediction: TurbinePrediction = await fetchTurbine(numericId);
      return predictionToTurbineMetrics(prediction);
    },
    enabled: !!id && !isNaN(numericId),
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useGetFleetMetrics() {
  return useQuery<FleetMetrics>({
    queryKey: ['fleetMetrics'],
    queryFn: async () => {
      const bm: BusinessMetricsResponse = await fetchBusinessMetrics();
      return {
        totalSavings: bm.total_savings,
        costAvoidance: bm.cost_avoidance,
        falseAlarmCosts: bm.false_alarm_costs,
        roi: bm.roi,
        confusionMatrix: {
          truePositive: bm.confusion_matrix.true_positive,
          falsePositive: bm.confusion_matrix.false_positive,
          trueNegative: bm.confusion_matrix.true_negative,
          falseNegative: bm.confusion_matrix.false_negative,
        },
        rocAuc: bm.roc_auc,
        prAuc: bm.pr_auc,
      };
    },
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}


export function useFleetSummary() {
  return useQuery<FleetSummary>({
    queryKey: ['fleetSummary'],
    queryFn: fetchFleetSummary,
    staleTime: 10000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useTurbineHistory(id: string, days: number = 30) {
  const numericId = parseInt(id, 10);
  return useQuery<TurbineHistoryResponse>({
    queryKey: ['turbineHistory', id, days],
    queryFn: async () => {
      return fetchTurbineHistory(numericId, days);
    },
    enabled: !!id && !isNaN(numericId),
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useTurbineShap(id: string) {
  const numericId = parseInt(id, 10);
  return useQuery<ShapResponse>({
    queryKey: ['turbineShap', id],
    queryFn: async () => {
      return fetchTurbineShap(numericId);
    },
    enabled: !!id && !isNaN(numericId),
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useFleetRiskHistory(turbineIds: string[]) {
  const normalizedIds = Array.from(new Set(turbineIds.filter(id => !isNaN(parseInt(id, 10)))));

  return useQuery<FleetRiskHistory>({
    queryKey: ['fleetRiskHistory', normalizedIds.sort().join(',')],
    queryFn: async () => {
      if (normalizedIds.length === 0) {
        return {
          dayRiskScores: Array.from({ length: 30 }, () => 0),
          predictedFailures30d: 0,
          avgConfidence: 0,
        };
      }

      const histories = await Promise.all(
        normalizedIds.map(id => fetchTurbineHistory(parseInt(id, 10), 30))
      );

      const byDay: Record<string, { sumProb: number; count: number; highCount: number }> = {};
      const turbinesAtRisk = new Set<string>();
      let highProbTotal = 0;
      let highProbCount = 0;

      histories.forEach((history, idx) => {
        const turbineId = normalizedIds[idx];
        history.data.forEach((entry) => {
          const dateKey = entry.timestamp.slice(0, 10);
          if (!byDay[dateKey]) {
            byDay[dateKey] = { sumProb: 0, count: 0, highCount: 0 };
          }

          const probability = Number(entry.probability) || 0;
          byDay[dateKey].sumProb += probability;
          byDay[dateKey].count += 1;

          if (probability > 0.5) {
            byDay[dateKey].highCount += 1;
            turbinesAtRisk.add(turbineId);
            highProbTotal += probability;
            highProbCount += 1;
          }
        });
      });

      const sortedDays = Object.keys(byDay).sort();
      const dayRiskScores = sortedDays.map((day) => {
        const d = byDay[day];
        const avgProb = d.sumProb / Math.max(d.count, 1);
        const highRatio = d.highCount / Math.max(d.count, 1);
        return Math.min(1, avgProb * 0.7 + highRatio * 0.8);
      });

      const paddedScores =
        dayRiskScores.length >= 30
          ? dayRiskScores.slice(-30)
          : [...Array.from({ length: 30 - dayRiskScores.length }, () => 0), ...dayRiskScores];

      return {
        dayRiskScores: paddedScores,
        predictedFailures30d: turbinesAtRisk.size,
        avgConfidence: highProbCount > 0 ? highProbTotal / highProbCount : 0,
      };
    },
    enabled: normalizedIds.length > 0,
    staleTime: 5000,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
    retryDelay: 5000,
  });
}
