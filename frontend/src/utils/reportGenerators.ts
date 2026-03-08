/**
 * Report generators for the Export & Reporting Center.
 * These generate mock/demo report content for download.
 */

import { MOCK_TURBINES, MOCK_FLEET_METRICS } from '../lib/mockData';

export function generateExecutiveSummary(): string {
    const now = new Date().toISOString().slice(0, 10);
    const critical = MOCK_TURBINES.filter(t => t.riskLevel === 'critical').length;
    const warning = MOCK_TURBINES.filter(t => t.riskLevel === 'warning').length;
    const healthy = MOCK_TURBINES.filter(t => t.riskLevel === 'healthy').length;
    const avgHealth = (MOCK_TURBINES.reduce((s, t) => s + t.healthScore, 0) / MOCK_TURBINES.length).toFixed(1);

    return `WINDMILL PREDICTIVE MAINTENANCE - EXECUTIVE SUMMARY
Date: ${now}
======================================================

FLEET OVERVIEW
  Total Turbines: ${MOCK_TURBINES.length}
  Critical: ${critical}
  Warning: ${warning}
  Healthy: ${healthy}
  Average Health Score: ${avgHealth}%

FINANCIAL IMPACT
  Total Savings: $${(MOCK_FLEET_METRICS.totalSavings / 1e9).toFixed(1)}B
  Cost Avoidance: $${(MOCK_FLEET_METRICS.costAvoidance / 1e9).toFixed(1)}B
  ROI: ${MOCK_FLEET_METRICS.roi}x

MODEL PERFORMANCE
  ROC AUC: ${MOCK_FLEET_METRICS.rocAuc}
  PR AUC: ${MOCK_FLEET_METRICS.prAuc}

IMMEDIATE ACTIONS REQUIRED
${MOCK_TURBINES.filter(t => t.riskLevel === 'critical').map(t => `  - ${t.id}: Health ${t.healthScore}%, RUL ${t.remainingUsefulLife} days`).join('\n')}
`;
}

export function generateMaintenancePlan(): string {
    const header = 'Turbine ID,Risk Level,Health Score,Failure Probability,RUL (days),Recommended Action,Priority\n';
    const rows = MOCK_TURBINES
        .filter(t => t.riskLevel !== 'healthy')
        .sort((a, b) => a.healthScore - b.healthScore)
        .map(t => {
            const action = t.riskLevel === 'critical' ? 'Immediate Inspection' : 'Scheduled Maintenance';
            const priority = t.riskLevel === 'critical' ? 'HIGH' : 'MEDIUM';
            return `${t.id},${t.riskLevel},${t.healthScore},${(t.failureProbability * 100).toFixed(1)}%,${t.remainingUsefulLife},${action},${priority}`;
        })
        .join('\n');
    return header + rows;
}

export function generatePerformanceReview(): string {
    const header = 'Metric,Value\n';
    const rows = [
        `Total Turbines,${MOCK_TURBINES.length}`,
        `Average Health Score,${(MOCK_TURBINES.reduce((s, t) => s + t.healthScore, 0) / MOCK_TURBINES.length).toFixed(1)}%`,
        `Critical Turbines,${MOCK_TURBINES.filter(t => t.riskLevel === 'critical').length}`,
        `Warning Turbines,${MOCK_TURBINES.filter(t => t.riskLevel === 'warning').length}`,
        `Healthy Turbines,${MOCK_TURBINES.filter(t => t.riskLevel === 'healthy').length}`,
        `Total Savings,$${(MOCK_FLEET_METRICS.totalSavings / 1e9).toFixed(1)}B`,
        `ROI,${MOCK_FLEET_METRICS.roi}x`,
        `Model ROC AUC,${MOCK_FLEET_METRICS.rocAuc}`,
        `Model PR AUC,${MOCK_FLEET_METRICS.prAuc}`,
    ].join('\n');
    return header + rows;
}

export function generateFleetHealthReport(): string {
    const header = 'Turbine ID,Health Score,Risk Level,Failure Probability,RUL (days),Gearbox Temp,RPM,Power Efficiency,Vibration\n';
    const rows = MOCK_TURBINES.map(t => {
        const latest = t.sensorReadings[t.sensorReadings.length - 1];
        return `${t.id},${t.healthScore},${t.riskLevel},${(t.failureProbability * 100).toFixed(1)}%,${t.remainingUsefulLife},${latest?.gearboxTemp?.toFixed(1) ?? 'N/A'},${latest?.rpm?.toFixed(0) ?? 'N/A'},${latest?.powerEfficiency?.toFixed(3) ?? 'N/A'},${latest?.vibration?.toFixed(2) ?? 'N/A'}`;
    }).join('\n');
    return header + rows;
}

export function generateRawDataExport(): string {
    const header = 'Turbine ID,Day,Gearbox Temp,RPM,Power Efficiency,Vibration,Phase Current,Drivetrain Ratio,Turbulence,Reactive Power Ratio\n';
    const rows: string[] = [];
    MOCK_TURBINES.forEach(t => {
        t.sensorReadings.forEach((r, i) => {
            rows.push(`${t.id},${i + 1},${r.gearboxTemp.toFixed(1)},${r.rpm.toFixed(0)},${r.powerEfficiency.toFixed(3)},${r.vibration.toFixed(2)},${r.phaseCurrent.toFixed(1)},${r.drivetrainRatio.toFixed(2)},${r.turbulenceIntensity.toFixed(3)},${r.reactivePowerRatio.toFixed(3)}`);
        });
    });
    return header + rows.join('\n');
}

export function generateShapExport(): string {
    const featureNames = [
        'gearbox_delta_mean_24h', 'drivetrain_ratio_std_24h', 'power_efficiency',
        'turbulence_mean_3h', 'current_std_lag_1', 'vibration_trend',
        'rpm_stability', 'reactive_power_spike', 'ambient_temp_effect', 'maintenance_recency'
    ];
    const header = `Turbine ID,${featureNames.join(',')}\n`;
    const rows = MOCK_TURBINES.map(t => {
        const vals = t.shapContributions.map(v => v.toFixed(4)).join(',');
        return `${t.id},${vals}`;
    }).join('\n');
    return header + rows;
}
