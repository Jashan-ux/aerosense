"""
Convert Dashboard CSV to SQLite
=================================
Reads the compact dashboard CSV and daily summary, creates an indexed
SQLite database for sub-second dashboard queries.

Tables created:
  - readings        : 1.2M rows — every 10-min reading per turbine
  - daily_summary   : ~3K rows — one row per asset per day
  - events          : 22 rows — failure/normal event catalogue
  - assets          : 5 rows — turbine metadata
  - model_metadata  : model performance info

Indexes on (asset_id, date), (health_status), (maintenance_urgency),
(asset_id, time_stamp) for fast filtered queries.
"""

import os, sys, time, sqlite3
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(BASE, "output")
DB_PATH = os.path.join(OUT, "dashboard.db")

# Remove old DB if exists
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"Removed existing {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode=WAL")       # faster concurrent reads
conn.execute("PRAGMA synchronous=NORMAL")      # faster writes
conn.execute("PRAGMA cache_size=-64000")       # 64MB cache
conn.execute("PRAGMA temp_store=MEMORY")

# ═══════════════════════════════════════════════════════════════════════════════
# 1. READINGS TABLE (compact dashboard data)
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 60)
print("Loading dashboard_compact.csv...")
t0 = time.time()

df = pd.read_csv(os.path.join(OUT, "dashboard_compact.csv"), low_memory=False)
print(f"  Loaded {len(df):,} rows x {df.shape[1]} cols in {time.time()-t0:.1f}s")

# Ensure proper types
df["time_stamp"] = pd.to_datetime(df["time_stamp"]).astype(str)
df["date"] = df["date"].astype(str)
df["year_month"] = df["year_month"].astype(str)
df["asset_id"] = df["asset_id"].astype(int)

print("Writing to SQLite 'readings' table...")
t0 = time.time()
df.to_sql("readings", conn, if_exists="replace", index=False,
          dtype={
              "time_stamp": "TEXT",
              "asset_id": "INTEGER",
              "source_event_id": "INTEGER",
              "date": "TEXT",
              "week": "INTEGER",
              "year_month": "TEXT",
              "hour": "INTEGER",
              "day_of_week": "INTEGER",
              "month": "INTEGER",
              "actual_RUL_days": "REAL",
              "actual_failure_within_7d": "INTEGER",
              "is_during_failure": "INTEGER",
              "nearest_failure_type": "TEXT",
              "predicted_RUL_days": "REAL",
              "predicted_failure_prob": "REAL",
              "predicted_failure_flag": "INTEGER",
              "health_status": "TEXT",
              "risk_score": "REAL",
              "maintenance_urgency": "TEXT",
              "sensor_0_avg": "REAL",
              "wind_speed_3_avg": "REAL",
              "power_30_avg": "REAL",
              "temp_spread": "REAL",
              "temp_mean": "REAL",
              "power_efficiency": "REAL",
              "hours_since_status_change": "REAL",
          })
print(f"  Written in {time.time()-t0:.1f}s")

# ═══════════════════════════════════════════════════════════════════════════════
# 2. DAILY SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════════════════════
print("\nLoading dashboard_daily_summary.csv...")
daily = pd.read_csv(os.path.join(OUT, "dashboard_daily_summary.csv"))
daily["date"] = daily["date"].astype(str)
daily["asset_id"] = daily["asset_id"].astype(int)
daily.to_sql("daily_summary", conn, if_exists="replace", index=False)
print(f"  Written {len(daily):,} rows to 'daily_summary'")

# ═══════════════════════════════════════════════════════════════════════════════
# 3. EVENTS TABLE
# ═══════════════════════════════════════════════════════════════════════════════
print("\nLoading event_info_updated.csv...")
events = pd.read_csv(os.path.join(BASE, "event_info_updated.csv"))
events.to_sql("events", conn, if_exists="replace", index=False)
print(f"  Written {len(events)} rows to 'events'")

# ═══════════════════════════════════════════════════════════════════════════════
# 4. ASSETS TABLE (derived from readings)
# ═══════════════════════════════════════════════════════════════════════════════
print("\nCreating 'assets' lookup table...")
assets_df = df.groupby("asset_id").agg(
    first_reading=("time_stamp", "min"),
    last_reading=("time_stamp", "max"),
    total_readings=("time_stamp", "count"),
).reset_index()

# Add failure counts per asset
failure_counts = events[events["event_label"] == "anomaly"].groupby("asset").size().reset_index(name="total_failures")
failure_counts.columns = ["asset_id", "total_failures"]
assets_df = assets_df.merge(failure_counts, on="asset_id", how="left")
assets_df["total_failures"] = assets_df["total_failures"].fillna(0).astype(int)

assets_df.to_sql("assets", conn, if_exists="replace", index=False)
print(f"  Written {len(assets_df)} rows to 'assets'")

# ═══════════════════════════════════════════════════════════════════════════════
# 5. MODEL METADATA TABLE
# ═══════════════════════════════════════════════════════════════════════════════
print("\nCreating 'model_metadata' table...")
import json
with open(os.path.join(OUT, "summary_report.json")) as f:
    summary = json.load(f)

meta_rows = [
    ("rul_model", "algorithm", summary["rul_model"]["algorithm"]),
    ("rul_model", "MAE_days", str(summary["rul_model"]["MAE_days"])),
    ("rul_model", "RMSE_days", str(summary["rul_model"]["RMSE_days"])),
    ("rul_model", "R2", str(summary["rul_model"]["R2"])),
    ("cls_model", "algorithm", summary["failure_classifier"]["algorithm"]),
    ("cls_model", "horizon_days", str(summary["failure_classifier"]["horizon_days"])),
    ("cls_model", "ROC_AUC", str(summary["failure_classifier"]["ROC_AUC"])),
    ("cls_model", "PR_AUC", str(summary["failure_classifier"]["PR_AUC"])),
    ("cost", "total_reactive_EUR", str(summary["cost_analysis"]["total_reactive_cost_EUR"])),
    ("cost", "total_proactive_EUR", str(summary["cost_analysis"]["total_proactive_cost_EUR"])),
    ("cost", "net_savings_EUR", str(summary["cost_analysis"]["net_savings_EUR"])),
    ("cost", "savings_pct", str(summary["cost_analysis"]["savings_pct"])),
]

conn.execute("CREATE TABLE model_metadata (category TEXT, key TEXT, value TEXT)")
conn.executemany("INSERT INTO model_metadata VALUES (?, ?, ?)", meta_rows)
print(f"  Written {len(meta_rows)} rows to 'model_metadata'")

# ═══════════════════════════════════════════════════════════════════════════════
# 6. CREATE INDEXES
# ═══════════════════════════════════════════════════════════════════════════════
print("\nCreating indexes...")
t0 = time.time()

indexes = [
    # Primary lookup patterns for dashboard
    ("idx_readings_asset_ts",        "readings", "asset_id, time_stamp"),
    ("idx_readings_asset_date",      "readings", "asset_id, date"),
    ("idx_readings_health",          "readings", "health_status"),
    ("idx_readings_urgency",         "readings", "maintenance_urgency"),
    ("idx_readings_date",            "readings", "date"),
    ("idx_readings_asset_health",    "readings", "asset_id, health_status"),
    ("idx_readings_failure_flag",    "readings", "predicted_failure_flag"),
    ("idx_readings_rul",             "readings", "predicted_RUL_days"),
    # Daily summary indexes
    ("idx_daily_asset_date",         "daily_summary", "asset_id, date"),
    ("idx_daily_health",             "daily_summary", "health_status"),
    ("idx_daily_urgency",            "daily_summary", "maintenance_urgency"),
]

for idx_name, table, columns in indexes:
    sql = f"CREATE INDEX {idx_name} ON {table} ({columns})"
    conn.execute(sql)
    print(f"  {idx_name}")

print(f"  All indexes created in {time.time()-t0:.1f}s")

conn.execute("ANALYZE")  # update query planner statistics
conn.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# 7. VERIFY PERFORMANCE
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("QUERY PERFORMANCE TESTS")
print("=" * 60)

test_queries = [
    ("Latest health status per asset",
     """SELECT asset_id, health_status, predicted_RUL_days, risk_score,
               maintenance_urgency, time_stamp
        FROM readings
        WHERE (asset_id, time_stamp) IN (
            SELECT asset_id, MAX(time_stamp) FROM readings GROUP BY asset_id
        )"""),

    ("All Critical/Warning readings for Asset 0",
     """SELECT time_stamp, predicted_RUL_days, predicted_failure_prob,
               health_status, maintenance_urgency
        FROM readings
        WHERE asset_id = 0 AND health_status IN ('Critical', 'Warning')
        ORDER BY time_stamp"""),

    ("Daily RUL trend for Asset 10 (last 30 days)",
     """SELECT date, predicted_RUL_min, predicted_RUL_mean, failure_prob_max,
               health_status, maintenance_urgency
        FROM daily_summary
        WHERE asset_id = 10
        ORDER BY date DESC LIMIT 30"""),

    ("Count readings by health status",
     """SELECT health_status, COUNT(*) as cnt
        FROM readings
        GROUP BY health_status
        ORDER BY cnt DESC"""),

    ("Failure events timeline",
     """SELECT asset_id, date, predicted_RUL_days, predicted_failure_prob,
               nearest_failure_type, health_status
        FROM readings
        WHERE predicted_failure_flag = 1
        ORDER BY asset_id, time_stamp
        LIMIT 100"""),

    ("Hourly average power & wind for Asset 21 on 2023-10-05",
     """SELECT hour, AVG(power_30_avg) as avg_power,
               AVG(wind_speed_3_avg) as avg_wind,
               AVG(predicted_RUL_days) as avg_rul
        FROM readings
        WHERE asset_id = 21 AND date = '2023-10-05'
        GROUP BY hour
        ORDER BY hour"""),

    ("Assets needing maintenance (daily summary)",
     """SELECT asset_id, date, predicted_RUL_min, failure_prob_max,
               health_status, maintenance_urgency, nearest_failure_type
        FROM daily_summary
        WHERE maintenance_urgency IN ('Immediate', 'Urgent')
        ORDER BY predicted_RUL_min ASC"""),
]

for label, sql in test_queries:
    t0 = time.time()
    cursor = conn.execute(sql)
    rows = cursor.fetchall()
    elapsed = time.time() - t0
    print(f"\n  [{elapsed*1000:.0f}ms] {label}")
    print(f"    -> {len(rows)} rows returned")
    if rows and len(rows) <= 5:
        cols = [desc[0] for desc in cursor.description]
        for r in rows:
            print(f"    {dict(zip(cols, r))}")

# Final DB stats
db_size_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
table_counts = {}
for table in ["readings", "daily_summary", "events", "assets", "model_metadata"]:
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    table_counts[table] = count

conn.close()

print("\n" + "=" * 60)
print("SQLITE DATABASE READY")
print("=" * 60)
print(f"\n  File: {DB_PATH}")
print(f"  Size: {db_size_mb:.1f} MB")
print(f"\n  Tables:")
for table, count in table_counts.items():
    print(f"    {table:20s} : {count:>10,} rows")
print(f"\n  Indexes: {len(indexes)} indexes for fast lookups")
print(f"\n  Usage from Python:")
print(f'    import sqlite3, pandas as pd')
print(f'    conn = sqlite3.connect("{DB_PATH}")')
print(f'    df = pd.read_sql("SELECT * FROM daily_summary WHERE asset_id=0", conn)')
