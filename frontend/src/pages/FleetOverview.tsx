import React, { useRef } from 'react';
import { useGetAllTurbines } from '../hooks/useQueries';
import { useFleetWebSocket } from '../hooks/useFleetWebSocket';
import KpiCardGrid from '../components/fleet/KpiCardGrid';
import WindFarmMap from '../components/fleet/WindFarmMap';
import RiskPriorityQueue from '../components/fleet/RiskPriorityQueue';
import { Skeleton } from '../components/ui/skeleton';
import { Wifi, WifiOff } from 'lucide-react';

function healthToRiskLevel(healthScore: number): string {
  if (healthScore < 50) return 'critical';
  if (healthScore < 80) return 'warning';
  return 'healthy';
}

export default function FleetOverview() {
  const { data: turbines, isLoading } = useGetAllTurbines();
  const baseTurbines = turbines || [];
  const { liveUpdates, isAnyConnected, connectedCount } = useFleetWebSocket(baseTurbines.map(t => t.id));
  const displayTurbines = React.useMemo(() => {
    return baseTurbines.map(turbine => {
      const live = liveUpdates[turbine.id];
      if (!live) return turbine;

      const lastReading = turbine.sensorReadings[turbine.sensorReadings.length - 1] || {};
      const wsReading = {
        ...lastReading,
        timestamp: new Date(live.timestamp).getTime(),
        gearboxTemp: live.sensors?.gearbox_temp ?? lastReading.gearboxTemp ?? 0,
        generatorTemp: live.sensors?.generator_temp ?? lastReading.generatorTemp ?? 0,
        vibration: live.sensors?.vibration ?? lastReading.vibration ?? 0,
        windSpeed: live.sensors?.wind_speed ?? lastReading.windSpeed ?? 0,
        powerOutput: live.sensors?.power_output ?? lastReading.powerOutput ?? 0,
        powerEfficiency: live.sensors?.drivetrain_ratio ?? lastReading.powerEfficiency ?? 0,
        rpm: live.sensors?.rpm ?? lastReading.rpm ?? 0,
        phaseCurrent: live.sensors?.current_std ?? lastReading.phaseCurrent ?? 0,
        drivetrainRatio: live.sensors?.drivetrain_ratio ?? lastReading.drivetrainRatio ?? 0,
        reactivePowerRatio: live.sensors?.reactive_ratio ?? lastReading.reactivePowerRatio ?? 0,
        turbulenceIntensity: live.sensors?.vibration ?? lastReading.turbulenceIntensity ?? 0,
      };

      const updatedReadings = [...turbine.sensorReadings, wsReading].slice(-30);
      const healthScore = live.health_score ?? turbine.healthScore;

      return {
        ...turbine,
        healthScore,
        failureProbability: live.probability ?? turbine.failureProbability,
        remainingUsefulLife: live.rul ?? turbine.remainingUsefulLife,
        riskLevel: healthToRiskLevel(healthScore),
        sensorReadings: updatedReadings,
      };
    });
  }, [baseTurbines, liveUpdates]);

  const hasLoadedOnce = useRef(false);

  if (!isLoading) {
    hasLoadedOnce.current = true;
  }

  const showSkeleton = isLoading && !hasLoadedOnce.current;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="font-montserrat font-800 text-xl" style={{ color: 'var(--color-text-primary)' }}>
          Fleet Command Center
        </h1>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            5 turbines monitored • Real-time predictive analytics
          </p>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: isAnyConnected ? 'rgba(0, 200, 83, 0.1)' : 'rgba(213, 0, 0, 0.1)',
              color: isAnyConnected ? '#00C853' : '#D50000',
            }}
          >
            {isAnyConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isAnyConnected ? `LIVE ${connectedCount}/5` : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {showSkeleton ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (
        <KpiCardGrid turbines={displayTurbines} />
      )}

      {/* Map + Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: '480px' }}>
        <div className="lg:col-span-2">
          <WindFarmMap turbines={displayTurbines} />
        </div>
        <div className="lg:col-span-1" style={{ minHeight: '480px' }}>
          <RiskPriorityQueue turbines={displayTurbines} />
        </div>
      </div>
    </div>
  );
}
