// ===== Core Data Types =====

export type Timestamp = number; // Unix ms

export interface SensorReading {
    rpm: number;
    vibration: number;
    powerEfficiency: number;
    powerOutput: number;
    reactivePowerRatio: number;
    turbulenceIntensity: number;
    timestamp: Timestamp;
    gearboxTemp: number;
    generatorTemp: number;
    windSpeed: number;
    drivetrainRatio: number;
    phaseCurrent: number;
}

export interface MaintenanceAction {
    action: string;
    downtimeHours: number;
    cost: number;
    notes: string;
    timestamp: Timestamp;
}

export interface FleetMetrics {
    roi: number;
    costAvoidance: number;
    totalSavings: number;
    falseAlarmCosts: number;
    confusionMatrix: {
        falsePositive: number;
        trueNegative: number;
        falseNegative: number;
        truePositive: number;
    };
    rocAuc: number;
    prAuc: number;
}

export interface TurbineMetrics {
    id: string;
    remainingUsefulLife: number;
    failureProbability: number;
    maintenanceEvents: Array<MaintenanceAction>;
    healthScore: number;
    sensorReadings: Array<SensorReading>;
    shapContributions: Array<number>;
    riskLevel: string;
}

// ===== API Response Types =====

export interface TurbinePrediction {
    asset_id: number;
    timestamp: string;
    failure_probability: number;
    predicted_failure: boolean;
    predicted_rul: number;
    health_score: number;
    sensors: {
        gearbox_temp: number;
        generator_temp: number;
        wind_speed: number;
        vibration: number;
        rpm: number;
        power_output: number;
    };
}

export interface TurbineHistoryEntry {
    timestamp: string;
    health_score: number;
    probability: number;
}

export interface TurbineHistoryResponse {
    turbine_id: number;
    data: TurbineHistoryEntry[];
}

export interface ShapFeature {
    feature: string;
    description: string;
    value: number;
    shap_value: number;
    impact: string;
}

export interface ShapResponse {
    prediction: number;
    baseline: number;
    top_features: ShapFeature[];
}

export interface FleetSummary {
    total_turbines: number;
    critical_count: number;
    warning_count: number;
    healthy_count: number;
    avg_health: number;
    total_savings: number;
    failures_prevented: number;
}

export interface BusinessMetricsResponse {
    total_savings: number;
    cost_avoidance: number;
    false_alarm_costs: number;
    roi: number;
    failures_prevented: number;
    confusion_matrix: {
        true_positive: number;
        false_positive: number;
        true_negative: number;
        false_negative: number;
    };
    roc_auc: number;
    pr_auc: number;
}

export interface LiveUpdate {
    turbine_id: number;
    timestamp: string;
    health_score: number;
    probability: number;
    rul: number;
    health_status?: string;
    maintenance_urgency?: string;
    sensors: {
        gearbox_temp: number;
        generator_temp: number;
        vibration: number;
        wind_speed: number;
        power_output: number;
        rpm: number;
        current_std: number;
        drivetrain_ratio: number;
        reactive_ratio: number;
    };
}
