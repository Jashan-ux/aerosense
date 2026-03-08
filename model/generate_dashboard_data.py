"""
Generate Dashboard Dataset
===========================
Loads the trained models (rul_model, cls_model) and feature_cols,
re-processes the full Wind Farm A dataset (all 22 CSVs, all 5 assets),
and produces a single combined CSV containing:
  - Metadata: time_stamp, asset_id, event_id(csv source)
  - Actual labels: RUL_days (actual), failure_within_7d (actual), is_during_failure
  - Predictions: predicted_RUL_days, predicted_failure_prob, predicted_failure_flag
  - All 308 engineered features used by the models
  - Health status category derived from predicted RUL
"""

import os, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
import xgboost as xgb
import joblib

# ─── Paths ──────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "datasets")
OUT  = os.path.join(BASE, "output")

EVENT_FILE   = os.path.join(BASE, "event_info_updated.csv")
SENSOR_CAT   = os.path.join(BASE, "farmA_categorized_sensors.csv")

# ─── Load trained models ────────────────────────────────────────────────────
print("Loading trained models...")
rul_model    = joblib.load(os.path.join(OUT, "rul_model.joblib"))
cls_model    = joblib.load(os.path.join(OUT, "cls_model.joblib"))
feature_cols = joblib.load(os.path.join(OUT, "feature_cols.joblib"))
print(f"  RUL model loaded ({rul_model.n_estimators} trees)")
print(f"  CLS model loaded ({cls_model.n_estimators} trees)")
print(f"  Feature columns: {len(feature_cols)}")

# ═══════════════════════════════════════════════════════════════════════════════
# 1. LOAD ALL DATA (same pipeline as predictive_maintenance.py)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 1: LOADING DATA")
print("=" * 70)

csv_files = sorted([f for f in os.listdir(DATA) if f.endswith(".csv")])
print(f"Found {len(csv_files)} turbine CSV files")

dfs = []
for f in csv_files:
    path = os.path.join(DATA, f)
    df_tmp = pd.read_csv(path, sep=";", low_memory=False)
    # Store the source CSV name (event_id) for traceability
    event_id = f.replace(".csv", "")
    df_tmp["source_event_id"] = int(event_id)
    dfs.append(df_tmp)

df_all = pd.concat(dfs, ignore_index=True)
print(f"Combined: {df_all.shape[0]:,} rows x {df_all.shape[1]} cols")

# Load events
events = pd.read_csv(EVENT_FILE)
events["event_start"] = pd.to_datetime(events["event_start"])
events["event_end"]   = pd.to_datetime(events["event_end"])
anomaly_events = events[events["event_label"] == "anomaly"].copy()

# ═══════════════════════════════════════════════════════════════════════════════
# 2. PREPROCESSING (identical to training pipeline)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 2: PREPROCESSING")
print("=" * 70)

df_all["time_stamp"] = pd.to_datetime(df_all["time_stamp"])
df_all.sort_values(["asset_id", "time_stamp"], inplace=True)
df_all.reset_index(drop=True, inplace=True)

meta_cols = ["time_stamp", "asset_id", "id", "train_test", "status_type_id", "source_event_id"]
sensor_cols = [c for c in df_all.columns if c not in meta_cols]

for c in sensor_cols:
    df_all[c] = pd.to_numeric(df_all[c], errors="coerce")

# Drop columns with >50% missing
missing_pct = df_all[sensor_cols].isna().sum() / len(df_all) * 100
drop_cols = missing_pct[missing_pct > 50].index.tolist()
if drop_cols:
    df_all.drop(columns=drop_cols, inplace=True)
    sensor_cols = [c for c in sensor_cols if c not in drop_cols]

# Outlier capping (IQR)
continuous_sensors = [c for c in sensor_cols if "avg" in c or "max" in c or "min" in c or "std" in c]
print("Capping outliers...")
for asset_id in df_all["asset_id"].unique():
    mask = df_all["asset_id"] == asset_id
    for col in continuous_sensors:
        s = df_all.loc[mask, col]
        Q1, Q3 = s.quantile(0.01), s.quantile(0.99)
        IQR = Q3 - Q1
        lower, upper = Q1 - 3 * IQR, Q3 + 3 * IQR
        df_all.loc[mask & (df_all[col] < lower), col] = lower
        df_all.loc[mask & (df_all[col] > upper), col] = upper

# Impute missing
print("Imputing missing values...")
df_all[sensor_cols] = df_all.groupby("asset_id")[sensor_cols].transform(
    lambda x: x.ffill().bfill()
)
remaining_na = df_all[sensor_cols].isna().sum().sum()
if remaining_na > 0:
    imputer = SimpleImputer(strategy="median")
    df_all[sensor_cols] = imputer.fit_transform(df_all[sensor_cols])

print(f"Clean: {df_all.shape[0]:,} rows, NaNs: {df_all[sensor_cols].isna().sum().sum()}")

# ═══════════════════════════════════════════════════════════════════════════════
# 3. LABEL ENGINEERING (actual targets for comparison)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 3: ACTUAL LABELS")
print("=" * 70)

RUL_CAP = 180
FAILURE_HORIZON = 7

# Build per-asset failure timeline
asset_failures = {}
for _, ev in anomaly_events.iterrows():
    aid = ev["asset"]
    if aid not in asset_failures:
        asset_failures[aid] = []
    asset_failures[aid].append((ev["event_start"], ev["event_description"]))

for aid in asset_failures:
    asset_failures[aid] = sorted(asset_failures[aid], key=lambda x: x[0])

# Compute actual RUL
rul_values = np.full(len(df_all), RUL_CAP, dtype=np.float64)
nearest_failure_type = ["Healthy"] * len(df_all)

for aid, fail_list in asset_failures.items():
    mask = df_all["asset_id"] == aid
    timestamps = df_all.loc[mask, "time_stamp"].values
    idx_arr = df_all.index[mask].values

    for ft, fdesc in fail_list:
        ft_np = np.datetime64(ft)
        delta = (ft_np - timestamps).astype("timedelta64[h]").astype(np.float64) / 24.0
        for i, d in zip(idx_arr, delta):
            if 0 < d < rul_values[i]:
                rul_values[i] = d
                nearest_failure_type[i] = fdesc

df_all["actual_RUL_days"] = rul_values
df_all["nearest_failure_type"] = nearest_failure_type
df_all["actual_failure_within_7d"] = (df_all["actual_RUL_days"] <= FAILURE_HORIZON).astype(int)

# Flag rows that are during an active failure event
df_all["is_during_failure"] = 0
for _, ev in anomaly_events.iterrows():
    mask = (
        (df_all["asset_id"] == ev["asset"]) &
        (df_all["time_stamp"] >= ev["event_start"]) &
        (df_all["time_stamp"] <= ev["event_end"])
    )
    df_all.loc[mask, "is_during_failure"] = 1

print(f"Actual RUL range: [{df_all['actual_RUL_days'].min():.2f}, {df_all['actual_RUL_days'].max():.1f}]")
print(f"Rows during active failure: {df_all['is_during_failure'].sum():,}")

# ═══════════════════════════════════════════════════════════════════════════════
# 4. FEATURE ENGINEERING (identical to training pipeline)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 4: FEATURE ENGINEERING")
print("=" * 70)

temp_cols = [c for c in sensor_cols if "sensor_" in c and "avg" in c and
             any(x in c for x in ["6","7","8","9","10","11","12","13","14","15","16","17","19","20","21","35","36","37","38","39","40","41","43","53"])]
power_cols = [c for c in sensor_cols if "power" in c and "avg" in c]
wind_cols  = [c for c in sensor_cols if "wind_speed" in c and "avg" in c]
key_sensors = [c for c in temp_cols + power_cols + wind_cols if c in df_all.columns]

WINDOWS = {"6h": 36, "24h": 144, "7d": 1008}

print(f"Computing rolling features for {len(key_sensors)} sensors...")
for window_name, window_size in WINDOWS.items():
    print(f"  Window: {window_name}...")
    for col in key_sensors:
        grp = df_all.groupby("asset_id")[col]
        df_all[f"{col}_roll_mean_{window_name}"] = grp.transform(
            lambda x: x.rolling(window_size, min_periods=1).mean()
        )
        df_all[f"{col}_roll_std_{window_name}"] = grp.transform(
            lambda x: x.rolling(window_size, min_periods=1).std().fillna(0)
        )

print("Computing rate-of-change features...")
for col in temp_cols:
    if col in df_all.columns:
        df_all[f"{col}_diff"] = df_all.groupby("asset_id")[col].diff().fillna(0)

print("Computing temperature spread features...")
if len(temp_cols) >= 2:
    temp_df = df_all[temp_cols]
    df_all["temp_max"] = temp_df.max(axis=1)
    df_all["temp_min"] = temp_df.min(axis=1)
    df_all["temp_spread"] = df_all["temp_max"] - df_all["temp_min"]
    df_all["temp_mean"] = temp_df.mean(axis=1)

print("Computing power efficiency proxy...")
if "power_30_avg" in df_all.columns and "wind_speed_3_avg" in df_all.columns:
    df_all["power_efficiency"] = df_all["power_30_avg"] / (df_all["wind_speed_3_avg"] + 0.1)

print("Computing time-based features...")
df_all["hour"] = df_all["time_stamp"].dt.hour
df_all["day_of_week"] = df_all["time_stamp"].dt.dayofweek
df_all["month"] = df_all["time_stamp"].dt.month

print("Computing operational hours feature...")
df_all["status_change"] = df_all.groupby("asset_id")["status_type_id"].diff().fillna(0).ne(0).astype(int)
df_all["hours_since_status_change"] = df_all.groupby(
    ["asset_id", df_all.groupby("asset_id")["status_change"].cumsum()]
).cumcount() / 6.0

print(f"Feature engineering complete. Dataset shape: {df_all.shape}")

# ═══════════════════════════════════════════════════════════════════════════════
# 5. GENERATE PREDICTIONS FOR ALL ROWS
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 5: GENERATING PREDICTIONS FOR ALL ROWS")
print("=" * 70)

# Validate feature alignment
missing_feats = [c for c in feature_cols if c not in df_all.columns]
if missing_feats:
    print(f"WARNING: {len(missing_feats)} features missing — filling with 0")
    for c in missing_feats:
        df_all[c] = 0

X_full = df_all[feature_cols].copy()
X_full.replace([np.inf, -np.inf], np.nan, inplace=True)
X_full.fillna(0, inplace=True)

print(f"Predicting on {len(X_full):,} rows...")

# RUL predictions
print("  Predicting RUL...")
predicted_rul = rul_model.predict(X_full)
predicted_rul = np.clip(predicted_rul, 0, RUL_CAP)

# Failure probability predictions
print("  Predicting failure probability...")
predicted_failure_prob = cls_model.predict_proba(X_full)[:, 1]
predicted_failure_flag = cls_model.predict(X_full)

df_all["predicted_RUL_days"]      = predicted_rul
df_all["predicted_failure_prob"]   = predicted_failure_prob
df_all["predicted_failure_flag"]   = predicted_failure_flag

# ═══════════════════════════════════════════════════════════════════════════════
# 6. DERIVE DASHBOARD-FRIENDLY COLUMNS
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 6: DERIVING DASHBOARD COLUMNS")
print("=" * 70)

# Health status category based on predicted RUL
def rul_to_health(rul):
    if rul <= 7:
        return "Critical"
    elif rul <= 30:
        return "Warning"
    elif rul <= 90:
        return "Monitor"
    else:
        return "Healthy"

df_all["health_status"] = df_all["predicted_RUL_days"].apply(rul_to_health)

# Risk score 0-100 (inverse of RUL, normalized)
df_all["risk_score"] = ((RUL_CAP - df_all["predicted_RUL_days"]) / RUL_CAP * 100).clip(0, 100).round(1)

# Maintenance urgency
def urgency(row):
    if row["predicted_failure_flag"] == 1:
        return "Immediate"
    elif row["predicted_RUL_days"] <= 14:
        return "Urgent"
    elif row["predicted_RUL_days"] <= 30:
        return "Plan Soon"
    elif row["predicted_RUL_days"] <= 90:
        return "Schedule"
    else:
        return "No Action"

df_all["maintenance_urgency"] = df_all.apply(urgency, axis=1)

# Date columns for easy dashboard filtering
df_all["date"] = df_all["time_stamp"].dt.date
df_all["week"] = df_all["time_stamp"].dt.isocalendar().week.astype(int)
df_all["year_month"] = df_all["time_stamp"].dt.to_period("M").astype(str)

print("Dashboard columns added:")
print(f"  health_status distribution:\n{df_all['health_status'].value_counts().to_string()}")
print(f"\n  maintenance_urgency distribution:\n{df_all['maintenance_urgency'].value_counts().to_string()}")

# ═══════════════════════════════════════════════════════════════════════════════
# 7. ASSEMBLE & SAVE FINAL DASHBOARD DATASET
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 7: SAVING DASHBOARD DATASET")
print("=" * 70)

# Column ordering for the output file:
# 1. Metadata & identifiers
# 2. Actual labels (ground truth)
# 3. Predictions & derived columns
# 4. All engineered features

meta_output = [
    "time_stamp", "asset_id", "source_event_id",
    "date", "week", "year_month", "hour", "day_of_week", "month",
]

actual_labels = [
    "actual_RUL_days", "actual_failure_within_7d", "is_during_failure",
    "nearest_failure_type",
]

prediction_cols = [
    "predicted_RUL_days", "predicted_failure_prob", "predicted_failure_flag",
    "health_status", "risk_score", "maintenance_urgency",
]

# Keep key raw sensor readings for dashboard charts
key_dashboard_sensors = []
for col in ["sensor_0_avg", "wind_speed_3_avg", "power_30_avg",
            "sensor_6_avg", "sensor_7_avg", "sensor_8_avg",
            "sensor_9_avg", "sensor_37_avg", "sensor_38_avg",
            "sensor_41_avg", "sensor_43_avg", "sensor_53_avg",
            "reactive_power_34_avg", "rotor_speed_4_avg",
            "temp_spread", "temp_mean", "power_efficiency",
            "hours_since_status_change"]:
    if col in df_all.columns:
        key_dashboard_sensors.append(col)

# Final column order
output_columns = meta_output + actual_labels + prediction_cols + key_dashboard_sensors + feature_cols

# De-duplicate (some feature_cols may overlap with key_dashboard_sensors)
seen = set()
output_columns_deduped = []
for c in output_columns:
    if c not in seen and c in df_all.columns:
        output_columns_deduped.append(c)
        seen.add(c)

df_output = df_all[output_columns_deduped]

print(f"Final dashboard dataset: {df_output.shape[0]:,} rows x {df_output.shape[1]} cols")
print(f"Column groups:")
print(f"  Metadata:          {len([c for c in meta_output if c in seen])}")
print(f"  Actual labels:     {len([c for c in actual_labels if c in seen])}")
print(f"  Predictions:       {len([c for c in prediction_cols if c in seen])}")
print(f"  Key sensors:       {len(key_dashboard_sensors)}")
print(f"  All features:      {len(feature_cols)}")

# Save as CSV
csv_path = os.path.join(OUT, "dashboard_data.csv")
print(f"\nSaving full dataset to {csv_path}...")
df_output.to_csv(csv_path, index=False)
csv_size_mb = os.path.getsize(csv_path) / (1024 * 1024)
print(f"  Saved: dashboard_data.csv ({csv_size_mb:.1f} MB)")

# Save a compact dashboard CSV (no 308 features, just metadata + predictions + key sensors)
compact_cols = meta_output + actual_labels + prediction_cols + key_dashboard_sensors
compact_cols = [c for c in compact_cols if c in df_output.columns]
compact_path = os.path.join(OUT, "dashboard_compact.csv")
df_output[compact_cols].to_csv(compact_path, index=False)
compact_mb = os.path.getsize(compact_path) / (1024 * 1024)
print(f"  Saved: dashboard_compact.csv ({compact_mb:.1f} MB, {len(compact_cols)} cols — no feature columns)")

# Also save a smaller summary per asset per day (for high-level dashboard views)
print("\nGenerating daily summary per asset...")
daily = df_all.groupby(["asset_id", "date"]).agg(
    predicted_RUL_min=("predicted_RUL_days", "min"),
    predicted_RUL_mean=("predicted_RUL_days", "mean"),
    predicted_RUL_max=("predicted_RUL_days", "max"),
    failure_prob_max=("predicted_failure_prob", "max"),
    failure_prob_mean=("predicted_failure_prob", "mean"),
    failure_flags=("predicted_failure_flag", "sum"),
    risk_score_max=("risk_score", "max"),
    risk_score_mean=("risk_score", "mean"),
    actual_RUL_min=("actual_RUL_days", "min"),
    actual_failure_count=("actual_failure_within_7d", "sum"),
    is_during_failure_count=("is_during_failure", "sum"),
    readings_count=("predicted_RUL_days", "count"),
    wind_speed_mean=("wind_speed_3_avg", "mean") if "wind_speed_3_avg" in df_all.columns else ("predicted_RUL_days", "count"),
    power_mean=("power_30_avg", "mean") if "power_30_avg" in df_all.columns else ("predicted_RUL_days", "count"),
    temp_spread_mean=("temp_spread", "mean") if "temp_spread" in df_all.columns else ("predicted_RUL_days", "count"),
).reset_index()

# Add health status (worst status of the day)
daily["health_status"] = daily["predicted_RUL_min"].apply(rul_to_health)

# Maintenance urgency for the day
def daily_urgency(row):
    if row["failure_flags"] > 0:
        return "Immediate"
    elif row["predicted_RUL_min"] <= 14:
        return "Urgent"
    elif row["predicted_RUL_min"] <= 30:
        return "Plan Soon"
    elif row["predicted_RUL_min"] <= 90:
        return "Schedule"
    else:
        return "No Action"

daily["maintenance_urgency"] = daily.apply(daily_urgency, axis=1)
daily["nearest_failure_type"] = df_all.groupby(["asset_id", "date"])["nearest_failure_type"].first().values

daily_path = os.path.join(OUT, "dashboard_daily_summary.csv")
daily.to_csv(daily_path, index=False)
daily_size = os.path.getsize(daily_path) / 1024
print(f"  Saved: dashboard_daily_summary.csv ({daily_size:.0f} KB, {len(daily):,} rows)")

# ═══════════════════════════════════════════════════════════════════════════════
# 8. PRINT SAMPLE & SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SAMPLE ROWS FROM DASHBOARD DATA")
print("=" * 70)

# Show a few rows approaching failure for each asset
for aid in sorted(df_all["asset_id"].unique()):
    subset = df_all[(df_all["asset_id"] == aid) & (df_all["actual_RUL_days"] < 10) & (df_all["is_during_failure"] == 0)]
    if len(subset) > 0:
        sample = subset.head(3)
        print(f"\nAsset {aid} (approaching failure):")
        for _, row in sample.iterrows():
            print(f"  {row['time_stamp']}  |  Actual RUL: {row['actual_RUL_days']:.1f}d  |  "
                  f"Predicted RUL: {row['predicted_RUL_days']:.1f}d  |  "
                  f"Failure Prob: {row['predicted_failure_prob']:.4f}  |  "
                  f"Health: {row['health_status']}  |  "
                  f"Urgency: {row['maintenance_urgency']}  |  "
                  f"Type: {row['nearest_failure_type']}")

print("\n" + "=" * 70)
print("DASHBOARD DATA GENERATION COMPLETE")
print("=" * 70)
print(f"\nFiles saved:")
print(f"  [1] output/dashboard_data.csv           ({df_output.shape[0]:,} rows x {df_output.shape[1]} cols)")
print(f"  [2] output/dashboard_daily_summary.csv   ({len(daily):,} rows)")
print(f"\nThese files contain all predictions ready for dashboard visualization.")
