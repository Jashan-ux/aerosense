import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetTurbine, useGetAllTurbines } from '../hooks/useQueries';
import { useWebSocket } from '../hooks/useWebSocket';
import QuickStatsBar from '../components/turbine/QuickStatsBar';
import HealthScoreChart from '../components/turbine/HealthScoreChart';
import FailureProbabilityChart from '../components/turbine/FailureProbabilityChart';
import RulPredictionChart from '../components/turbine/RulPredictionChart';
import SensorGrid from '../components/turbine/SensorGrid';
import ShapExplanationPanel from '../components/turbine/ShapExplanationPanel';
import MaintenanceRecommendationsPanel from '../components/turbine/MaintenanceRecommendationsPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export default function TurbineDeepDive() {
  const params = useParams({ from: '/turbine/$id' });
  const navigate = useNavigate();
  const turbineId = params.id || '0';
  const [brushRange, setBrushRange] = useState<[number, number] | null>(null);

  const { data: turbine, isLoading } = useGetTurbine(turbineId);
  const { data: allTurbines } = useGetAllTurbines();
  const { lastUpdate, isConnected } = useWebSocket(!isNaN(parseInt(turbineId, 10)) ? turbineId : undefined);

  // Auto-redirect if turbineId is non-numeric or invalid
  React.useEffect(() => {
    if (isNaN(parseInt(turbineId, 10)) && allTurbines && allTurbines.length > 0) {
      navigate({ to: '/turbine/$id', params: { id: allTurbines[0].id } });
    }
  }, [turbineId, allTurbines, navigate]);

  // Merge live WebSocket update into turbine — appends to the moving window
  const displayTurbine = React.useMemo(() => {
    if (!turbine) {
      if (allTurbines && allTurbines.length > 0) return allTurbines[0];
      return null;
    }
    if (!lastUpdate) return turbine;

    // Build a new reading from the WebSocket live update
    const lastReading = turbine.sensorReadings[turbine.sensorReadings.length - 1] || {};
    const wsReading = {
      ...lastReading,
      timestamp: new Date(lastUpdate.timestamp).getTime(),
      gearboxTemp: lastUpdate.sensors?.gearbox_temp ?? lastReading.gearboxTemp ?? 0,
      generatorTemp: lastUpdate.sensors?.generator_temp ?? lastReading.generatorTemp ?? 0,
      vibration: lastUpdate.sensors?.vibration ?? lastReading.vibration ?? 0,
      windSpeed: lastUpdate.sensors?.wind_speed ?? lastReading.windSpeed ?? 0,
      powerOutput: lastUpdate.sensors?.power_output ?? lastReading.powerOutput ?? 0,
      powerEfficiency: lastUpdate.sensors?.drivetrain_ratio ?? lastReading.powerEfficiency ?? 0,
      rpm: lastUpdate.sensors?.rpm ?? lastReading.rpm ?? 0,
      phaseCurrent: lastUpdate.sensors?.current_std ?? lastReading.phaseCurrent ?? 0,
      drivetrainRatio: lastUpdate.sensors?.drivetrain_ratio ?? lastReading.drivetrainRatio ?? 0,
      reactivePowerRatio: lastUpdate.sensors?.reactive_ratio ?? lastReading.reactivePowerRatio ?? 0,
      turbulenceIntensity: lastUpdate.sensors?.vibration ?? lastReading.turbulenceIntensity ?? 0,
    };
    // Append WS reading to history window, keep last 30
    const updatedReadings = [...turbine.sensorReadings, wsReading].slice(-30);

    return {
      ...turbine,
      healthScore: lastUpdate.health_score ?? turbine.healthScore,
      failureProbability: lastUpdate.probability ?? turbine.failureProbability,
      remainingUsefulLife: lastUpdate.rul ?? turbine.remainingUsefulLife,
      sensorReadings: updatedReadings,
    };
  }, [turbine, lastUpdate]);


  const handleTurbineChange = (id: string) => {
    navigate({ to: '/turbine/$id', params: { id } });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-montserrat font-800 text-xl" style={{ color: 'var(--color-text-primary)' }}>
            Turbine Deep Dive
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Engineer-level diagnostics & sensor analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 px-2.5 py-1 font-inter border-none"
            style={{
              backgroundColor: isConnected ? 'rgba(0, 200, 83, 0.1)' : 'rgba(213, 0, 0, 0.1)',
              color: isConnected ? '#00C853' : '#D50000'
            }}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'LIVE CONNECTED' : 'OFFLINE'}
          </Badge>

          <Select value={turbineId} onValueChange={handleTurbineChange}>
            <SelectTrigger
              className="w-40 font-mono text-sm"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              <SelectValue placeholder="Select turbine" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              {(allTurbines || []).map(t => (
                <SelectItem key={t.id} value={t.id} className="font-mono text-sm">
                  T-{t.id.padStart(3, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading || !displayTurbine ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <QuickStatsBar turbine={displayTurbine} />

          {/* Time series charts */}
          <div className="space-y-4">
            <HealthScoreChart turbine={displayTurbine} brushRange={brushRange} onBrushChange={setBrushRange} />
            <FailureProbabilityChart turbine={displayTurbine} brushRange={brushRange} />
            <RulPredictionChart turbine={displayTurbine} brushRange={brushRange} />
          </div>

          {/* Sensor grid */}
          <SensorGrid turbine={displayTurbine} />

          {/* SHAP + Maintenance side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ShapExplanationPanel turbine={displayTurbine} />
            <MaintenanceRecommendationsPanel turbine={displayTurbine} />
          </div>
        </>
      )}
    </div>
  );
}
