"""
db.py — SQLite query layer
All SQL is here; nothing else imports sqlite3 directly.
"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Optional

# ── paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "..", "model", "output")
DB_PATH    = os.path.join(OUTPUT_DIR, "dashboard.db")

# ── sensor column → semantic name mapping ──────────────────────────────────
# Based on feature_description.csv:
#   sensor_9   = Temperature on the VCP-board          (gearbox area proxy)
#   sensor_41  = Temperature oil in hydraulic group    (generator area proxy)
#   wind_speed_3 = Windspeed m/s
#   temp_spread  = mechanical variation proxy for vibration
#   power_30   = Grid power kW
#   sensor_8   = Choke coil temperature                (current proxy)
#   power_efficiency = derived power/wind ratio        (drivetrain proxy)
#   sensor_43  = Nacelle temperature                   (reactive proxy)
SENSOR_MAP = {
    "gearbox_temp":     "sensor_9_avg",
    "generator_temp":   "sensor_41_avg",
    "wind_speed":       "wind_speed_3_avg",
    "vibration":        "temp_spread",
    "power_output":     "power_30_avg",
    "current_std":      "sensor_8_avg",
    "drivetrain_ratio": "power_efficiency",
    "reactive_ratio":   "sensor_43_avg",
}

ASSET_IDS  = [0, 10, 11, 13, 21]
RUL_CAP    = 180.0
WINDOW     = 20   # readings per fetch chunk


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-32000")
    conn.execute("PRAGMA temp_store=MEMORY")
    try:
        yield conn
    finally:
        conn.close()


def _rul_to_health(rul: float) -> float:
    """Convert predicted RUL (0-180 days) to health score (0-100)."""
    return round(min(max(rul / RUL_CAP * 100, 0.0), 100.0), 1)


# ─── cursor helpers ────────────────────────────────────────────────────────

def get_asset_min_rowid(asset_id: int) -> int:
    with get_db() as conn:
        row = conn.execute(
            "SELECT MIN(row_id) FROM readings WHERE asset_id = ?", (asset_id,)
        ).fetchone()
        return int(row[0]) if row and row[0] else 1


def get_asset_max_rowid(asset_id: int) -> int:
    with get_db() as conn:
        row = conn.execute(
            "SELECT MAX(row_id) FROM readings WHERE asset_id = ?", (asset_id,)
        ).fetchone()
        return int(row[0]) if row and row[0] else 1


# ─── core reading fetch ────────────────────────────────────────────────────

def _build_sensor_select() -> str:
    """Build SELECT snippet for all mapped sensor columns."""
    parts = [f"{db_col} AS {api_name}"
             for api_name, db_col in SENSOR_MAP.items()]
    return ", ".join(parts)


def fetch_readings_window(asset_id: int, anchor_rowid: int, n: int = WINDOW):
    """
    Return the WINDOW rows for `asset_id` whose row_id >= anchor_rowid.
    Returns list of sqlite3.Row objects.
    """
    _sensors = _build_sensor_select()
    sql = f"""
        SELECT
            row_id,
            time_stamp,
            predicted_RUL_days,
            predicted_failure_prob,
            predicted_failure_flag,
            health_status,
            risk_score,
            maintenance_urgency,
            actual_RUL_days,
            actual_failure_within_7d,
            nearest_failure_type,
            is_during_failure,
            {_sensors}
        FROM readings
        WHERE asset_id = ? AND row_id >= ?
        ORDER BY row_id ASC
        LIMIT ?
    """
    with get_db() as conn:
        rows = conn.execute(sql, (asset_id, anchor_rowid, n)).fetchall()
    return rows


def fetch_latest_reading(asset_id: int):
    """Return the single most-recent row for an asset."""
    _sensors = _build_sensor_select()
    sql = f"""
        SELECT
            row_id, time_stamp,
            predicted_RUL_days, predicted_failure_prob, predicted_failure_flag,
            health_status, risk_score, maintenance_urgency,
            actual_RUL_days, actual_failure_within_7d,
            nearest_failure_type, is_during_failure,
            {_sensors}
        FROM readings
        WHERE asset_id = ?
        ORDER BY time_stamp DESC
        LIMIT 1
    """
    with get_db() as conn:
        return conn.execute(sql, (asset_id,)).fetchone()


# ─── history query ─────────────────────────────────────────────────────────

def fetch_turbine_history(asset_id: int, days: int = 30):
    """
    Return one daily aggregate row per day for the last `days` days
    of data (using daily_summary table).
    """
    sql = """
        SELECT
            date AS timestamp,
            ROUND(COALESCE(predicted_RUL_mean / 180.0 * 100, 0), 1) AS health_score,
            ROUND(COALESCE(failure_prob_mean, 0), 6)                  AS probability,
            ROUND(COALESCE(predicted_RUL_min, 180), 2)                AS min_rul,
            ROUND(COALESCE(predicted_RUL_mean, 180), 2)               AS mean_rul,
            ROUND(COALESCE(risk_score_max, 0), 1)                     AS risk_score,
            health_status,
            maintenance_urgency,
            nearest_failure_type
        FROM daily_summary
        WHERE asset_id = ?
        ORDER BY date DESC
        LIMIT ?
    """
    with get_db() as conn:
        rows = conn.execute(sql, (asset_id, days)).fetchall()
    return [dict(r) for r in reversed(rows)]


# ─── fleet queries ─────────────────────────────────────────────────────────

def fetch_fleet_daily_latest():
    """Latest daily summary row per asset (most recent date available)."""
    sql = """
        SELECT ds.*
        FROM daily_summary ds
        INNER JOIN (
            SELECT asset_id, MAX(date) AS max_date
            FROM daily_summary
            GROUP BY asset_id
        ) latest ON ds.asset_id = latest.asset_id AND ds.date = latest.max_date
        ORDER BY ds.asset_id
    """
    with get_db() as conn:
        rows = conn.execute(sql).fetchall()
    return [dict(r) for r in rows]


def fetch_fleet_summary_stats():
    """Aggregate health/status counts across all assets using latest date per asset."""
    sql = """
        SELECT
            COUNT(DISTINCT ds.asset_id)                                        AS total_turbines,
            SUM(CASE WHEN ds.health_status='Critical' THEN 1 ELSE 0 END)       AS critical_count,
            SUM(CASE WHEN ds.health_status='Warning'  THEN 1 ELSE 0 END)       AS warning_count,
            SUM(CASE WHEN ds.health_status='Healthy'  THEN 1 ELSE 0 END)       AS healthy_count,
            ROUND(AVG(ds.predicted_RUL_mean / 180.0 * 100), 1)                 AS avg_health
        FROM daily_summary ds
        INNER JOIN (
            SELECT asset_id, MAX(date) AS max_date
            FROM daily_summary
            GROUP BY asset_id
        ) latest ON ds.asset_id = latest.asset_id AND ds.date = latest.max_date
    """
    with get_db() as conn:
        return dict(conn.execute(sql).fetchone())


# ─── business metrics ──────────────────────────────────────────────────────

def fetch_model_metadata() -> dict:
    """Return all rows from model_metadata as a flat dict."""
    with get_db() as conn:
        rows = conn.execute("SELECT category, key, value FROM model_metadata").fetchall()
    return {f"{r['category']}:{r['key']}": r['value'] for r in rows}


def fetch_event_counts() -> dict:
    """Count anomaly events per type."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT event_description, COUNT(*) AS cnt FROM events "
            "WHERE event_label='anomaly' GROUP BY event_description"
        ).fetchall()
    return {r["event_description"]: r["cnt"] for r in rows}


# ─── SHAP proxy ────────────────────────────────────────────────────────────

def fetch_shap_window(asset_id: int, anchor_rowid: int, n: int = 5):
    """
    Return a small number of rows (n) with ALL compact sensor columns
    needed to build an approximate SHAP explanation.
    Falls back to latest rows if anchor_rowid misses.
    """
    sql = """
        SELECT
            row_id, time_stamp,
            predicted_RUL_days, predicted_failure_prob,
            sensor_6_avg, sensor_7_avg, sensor_8_avg, sensor_9_avg,
            sensor_37_avg, sensor_38_avg, sensor_41_avg,
            sensor_43_avg, sensor_53_avg,
            wind_speed_3_avg, power_30_avg,
            temp_spread, temp_mean, power_efficiency,
            hours_since_status_change,
            sensor_0_avg
        FROM readings
        WHERE asset_id = ? AND row_id >= ?
        ORDER BY row_id ASC
        LIMIT ?
    """
    with get_db() as conn:
        rows = conn.execute(sql, (asset_id, anchor_rowid, n)).fetchall()
    if not rows:
        # fallback: latest rows
        sql_fb = sql.replace("row_id >= ?", "1=1").replace("ORDER BY row_id ASC", "ORDER BY row_id DESC")
        with get_db() as conn:
            rows = conn.execute(sql_fb, (asset_id, n)).fetchall()
    return [dict(r) for r in rows]
