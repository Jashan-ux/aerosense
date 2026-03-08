"""
test_ws_and_db.py -- WebSocket real-time update test + database consistency audit
===================================================================================
1. Connects to WebSocket for each valid asset ID, collects 6 ticks (~60 seconds)
2. Validates that data actually changes between ticks (cursor advancement)
3. Checks tick timing (should be ~10s apart)
4. Audits the database for inconsistencies that could cause 422 errors
"""

import asyncio
import json
import time
import sqlite3
import os
import sys
from collections import defaultdict

# ── Config ──────────────────────────────────────────────────────────────────
BASE_URL = "ws://127.0.0.1:8000/ws/live"
REST_URL = "http://127.0.0.1:8000"
VALID_ASSET_IDS = [0, 10, 11, 13, 21]
NUM_TICKS = 6  # 6 ticks = ~60 seconds of data

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "model", "output", "dashboard.db")

# ═══════════════════════════════════════════════════════════════════════════
# PART 1: DATABASE CONSISTENCY AUDIT
# ═══════════════════════════════════════════════════════════════════════════

def audit_database():
    print("=" * 70)
    print("PART 1: DATABASE CONSISTENCY AUDIT")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        print(f"[FAIL] Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    all_ok = True

    # 1. Check what tables exist
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()]
    print(f"\n[INFO] Tables in database: {tables}")

    # 2. Check asset_id values in readings table
    print(f"\n--- Asset ID Consistency ---")
    asset_ids = [r[0] for r in conn.execute(
        "SELECT DISTINCT asset_id FROM readings ORDER BY asset_id"
    ).fetchall()]
    print(f"[INFO] Distinct asset_ids in readings: {asset_ids}")
    print(f"[INFO] Expected asset_ids:              {VALID_ASSET_IDS}")

    if set(asset_ids) != set(VALID_ASSET_IDS):
        print(f"[WARN] Asset ID MISMATCH!")
        extra = set(asset_ids) - set(VALID_ASSET_IDS)
        missing = set(VALID_ASSET_IDS) - set(asset_ids)
        if extra:
            print(f"       Extra in DB (not in API):   {sorted(extra)}")
        if missing:
            print(f"       Missing from DB:            {sorted(missing)}")
        all_ok = False
    else:
        print(f"[OK]   Asset IDs match perfectly")

    # 3. Row counts per asset
    print(f"\n--- Row Counts per Asset ---")
    for aid in asset_ids:
        count = conn.execute(
            "SELECT COUNT(*) FROM readings WHERE asset_id = ?", (aid,)
        ).fetchone()[0]
        min_rid = conn.execute(
            "SELECT MIN(row_id) FROM readings WHERE asset_id = ?", (aid,)
        ).fetchone()[0]
        max_rid = conn.execute(
            "SELECT MAX(row_id) FROM readings WHERE asset_id = ?", (aid,)
        ).fetchone()[0]
        print(f"  Asset {aid:>2}: {count:>6} rows, row_id range [{min_rid} .. {max_rid}]")

    # 4. Check for NULL values in critical columns
    print(f"\n--- NULL Value Check (critical columns) ---")
    critical_cols = [
        "time_stamp", "predicted_RUL_days", "predicted_failure_prob",
        "predicted_failure_flag", "health_status", "risk_score"
    ]
    for col in critical_cols:
        null_count = conn.execute(
            f"SELECT COUNT(*) FROM readings WHERE {col} IS NULL"
        ).fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
        status = "[OK]  " if null_count == 0 else "[WARN]"
        print(f"  {status} {col}: {null_count}/{total} NULLs")
        if null_count > 0:
            # Show which assets are affected
            affected = conn.execute(
                f"SELECT DISTINCT asset_id FROM readings WHERE {col} IS NULL ORDER BY asset_id"
            ).fetchall()
            print(f"         Affected assets: {[r[0] for r in affected]}")

    # 5. Check sensor columns for NULLs
    print(f"\n--- Sensor Column NULL Check ---")
    sensor_cols = [
        "sensor_9_avg", "sensor_41_avg", "wind_speed_3_avg",
        "temp_spread", "power_30_avg", "sensor_8_avg",
        "power_efficiency", "sensor_43_avg"
    ]
    for col in sensor_cols:
        try:
            null_count = conn.execute(
                f"SELECT COUNT(*) FROM readings WHERE {col} IS NULL"
            ).fetchone()[0]
            total = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
            pct = (null_count / total * 100) if total > 0 else 0
            status = "[OK]  " if null_count == 0 else "[WARN]"
            print(f"  {status} {col}: {null_count}/{total} NULLs ({pct:.1f}%)")
        except sqlite3.OperationalError as e:
            print(f"  [FAIL] {col}: Column not found -- {e}")
            all_ok = False

    # 6. Check for out-of-range values
    print(f"\n--- Value Range Check ---")
    range_checks = [
        ("predicted_RUL_days", 0, 300, "RUL should be 0-300 days"),
        ("predicted_failure_prob", 0, 1.0, "Probability should be 0-1"),
        ("risk_score", 0, 100, "Risk score should be 0-100"),
    ]
    for col, lo, hi, desc in range_checks:
        out_of_range = conn.execute(
            f"SELECT COUNT(*) FROM readings WHERE {col} < ? OR {col} > ?",
            (lo, hi)
        ).fetchone()[0]
        status = "[OK]  " if out_of_range == 0 else "[WARN]"
        print(f"  {status} {col} ({desc}): {out_of_range} out-of-range rows")
        if out_of_range > 0:
            sample = conn.execute(
                f"SELECT asset_id, {col} FROM readings WHERE {col} < ? OR {col} > ? LIMIT 5",
                (lo, hi)
            ).fetchall()
            for r in sample:
                print(f"         asset={r[0]}, value={r[1]}")

    # 7. Check daily_summary consistency
    if "daily_summary" in tables:
        print(f"\n--- daily_summary Audit ---")
        ds_assets = [r[0] for r in conn.execute(
            "SELECT DISTINCT asset_id FROM daily_summary ORDER BY asset_id"
        ).fetchall()]
        print(f"  [INFO] Assets in daily_summary: {ds_assets}")
        ds_count = conn.execute("SELECT COUNT(*) FROM daily_summary").fetchone()[0]
        print(f"  [INFO] Total rows: {ds_count}")

        for aid in ds_assets:
            dates = conn.execute(
                "SELECT MIN(date), MAX(date), COUNT(*) FROM daily_summary WHERE asset_id = ?",
                (aid,)
            ).fetchone()
            print(f"  Asset {aid:>2}: {dates[2]} days, range [{dates[0]} .. {dates[1]}]")

    # 8. Check for duplicate timestamps per asset
    print(f"\n--- Duplicate Timestamp Check ---")
    dupes = conn.execute("""
        SELECT asset_id, time_stamp, COUNT(*) as cnt
        FROM readings
        GROUP BY asset_id, time_stamp
        HAVING cnt > 1
        ORDER BY cnt DESC
        LIMIT 10
    """).fetchall()
    if dupes:
        print(f"  [WARN] Found {len(dupes)} duplicate timestamp groups (showing top 10):")
        for d in dupes:
            print(f"         asset={d[0]}, timestamp={d[1]}, count={d[2]}")
    else:
        print(f"  [OK]   No duplicate timestamps per asset")

    # 9. Timestamp ordering check per asset (row_id should match timestamp order)
    print(f"\n--- Timestamp Ordering Check ---")
    for aid in asset_ids:
        disorder = conn.execute("""
            SELECT COUNT(*) FROM (
                SELECT row_id, time_stamp,
                       LAG(time_stamp) OVER (ORDER BY row_id) AS prev_ts
                FROM readings WHERE asset_id = ?
            ) WHERE prev_ts IS NOT NULL AND time_stamp < prev_ts
        """, (aid,)).fetchone()[0]
        status = "[OK]  " if disorder == 0 else "[WARN]"
        print(f"  {status} Asset {aid:>2}: {disorder} rows where timestamp goes backwards")

    # 10. Check for NaN-like string values
    print(f"\n--- NaN String Check (could cause 422 errors) ---")
    for col in ["predicted_RUL_days", "predicted_failure_prob", "risk_score"]:
        nan_strings = conn.execute(
            f"SELECT COUNT(*) FROM readings WHERE CAST({col} AS TEXT) IN ('NaN', 'nan', 'inf', '-inf', 'None', 'null', '')"
        ).fetchone()[0]
        status = "[OK]  " if nan_strings == 0 else "[FAIL]"
        print(f"  {status} {col}: {nan_strings} NaN/inf/None string values")
        if nan_strings > 0:
            all_ok = False
            samples = conn.execute(
                f"SELECT asset_id, row_id, {col} FROM readings WHERE CAST({col} AS TEXT) IN ('NaN', 'nan', 'inf', '-inf', 'None', 'null', '') LIMIT 5"
            ).fetchall()
            for s in samples:
                print(f"         asset={s[0]}, row_id={s[1]}, value={s[2]}")

    conn.close()
    print(f"\n{'='*70}")
    if all_ok:
        print("DATABASE AUDIT: ALL CHECKS PASSED")
    else:
        print("DATABASE AUDIT: SOME ISSUES FOUND (see warnings above)")
    print(f"{'='*70}")
    return all_ok


# ═══════════════════════════════════════════════════════════════════════════
# PART 2: WEBSOCKET REAL-TIME TEST
# ═══════════════════════════════════════════════════════════════════════════

async def test_websocket_single_turbine(asset_id, num_ticks=NUM_TICKS):
    """Connect to WS, collect num_ticks updates, measure timing and data changes."""
    import websockets

    uri = BASE_URL
    ticks = []
    timestamps_received = []

    try:
        async with websockets.connect(uri) as ws:
            # Subscribe
            await ws.send(json.dumps({"turbine_id": asset_id}))

            for i in range(num_ticks):
                raw = await asyncio.wait_for(ws.recv(), timeout=20.0)
                recv_time = time.time()
                data = json.loads(raw)

                # Skip ping messages
                if data.get("type") == "ping":
                    continue

                # Skip error messages
                if "error" in data:
                    return {"asset_id": asset_id, "error": data["error"]}

                ticks.append(data)
                timestamps_received.append(recv_time)

    except asyncio.TimeoutError:
        return {"asset_id": asset_id, "error": f"Timeout after {len(ticks)} ticks"}
    except Exception as e:
        return {"asset_id": asset_id, "error": str(e)}

    return {
        "asset_id": asset_id,
        "ticks": ticks,
        "wall_times": timestamps_received,
    }


async def run_websocket_tests():
    print(f"\n{'='*70}")
    print(f"PART 2: WEBSOCKET REAL-TIME UPDATE TEST")
    print(f"Collecting {NUM_TICKS} ticks per turbine (~{NUM_TICKS * 10} seconds)")
    print(f"{'='*70}")

    try:
        import websockets
    except ImportError:
        print("[FAIL] websockets library not installed. Install with: pip install websockets")
        print("       Skipping WebSocket tests.")
        return False

    # Test one turbine at a time to avoid overwhelming
    test_asset = VALID_ASSET_IDS[0]  # Test asset 0 first for detailed analysis
    print(f"\n--- Detailed Test: Asset {test_asset} ({NUM_TICKS} ticks) ---")

    result = await test_websocket_single_turbine(test_asset, NUM_TICKS)

    if "error" in result:
        print(f"[FAIL] Error: {result['error']}")
        return False

    ticks = result["ticks"]
    wall_times = result["wall_times"]

    if len(ticks) < 2:
        print(f"[FAIL] Only received {len(ticks)} ticks, need at least 2")
        return False

    print(f"[OK]   Received {len(ticks)} ticks successfully")

    # Analyze tick timing
    print(f"\n  Tick Timing Analysis:")
    intervals = []
    for i in range(1, len(wall_times)):
        interval = wall_times[i] - wall_times[i - 1]
        intervals.append(interval)
        print(f"    Tick {i} -> {i+1}: {interval:.2f}s")

    avg_interval = sum(intervals) / len(intervals) if intervals else 0
    print(f"    Average interval: {avg_interval:.2f}s (expected: 10.0s)")
    if 8.0 <= avg_interval <= 12.0:
        print(f"    [OK]   Interval is within acceptable range (8-12s)")
    else:
        print(f"    [WARN] Interval outside expected range")

    # Analyze data changes between ticks
    print(f"\n  Data Change Analysis (6 consecutive readings):")
    print(f"  {'Tick':>4} | {'Timestamp':<22} | {'Health':>7} | {'Prob':>10} | {'RUL':>8} | {'Gearbox':>8} | {'Wind':>6} | {'Power':>8}")
    print(f"  {'-'*4}-+-{'-'*22}-+-{'-'*7}-+-{'-'*10}-+-{'-'*8}-+-{'-'*8}-+-{'-'*6}-+-{'-'*8}")

    data_timestamps = []
    health_scores = []
    probs = []
    ruls = []

    for i, tick in enumerate(ticks):
        ts = tick.get("timestamp", "N/A")
        hs = tick.get("health_score", "N/A")
        prob = tick.get("probability", "N/A")
        rul = tick.get("rul", "N/A")
        sensors = tick.get("sensors", {})
        gb = sensors.get("gearbox_temp", "N/A")
        ws_val = sensors.get("wind_speed", "N/A")
        pw = sensors.get("power_output", "N/A")

        data_timestamps.append(ts)
        if isinstance(hs, (int, float)):
            health_scores.append(hs)
        if isinstance(prob, (int, float)):
            probs.append(prob)
        if isinstance(rul, (int, float)):
            ruls.append(rul)

        print(f"  {i+1:>4} | {str(ts):<22} | {hs:>7} | {prob:>10} | {rul:>8} | {gb:>8} | {ws_val:>6} | {pw:>8}")

    # Check if data actually changes
    print(f"\n  Data Uniqueness Check:")
    unique_ts = len(set(data_timestamps))
    unique_hs = len(set(health_scores))
    unique_probs = len(set(probs))
    unique_ruls = len(set(ruls))

    print(f"    Unique timestamps:    {unique_ts}/{len(ticks)}")
    print(f"    Unique health scores: {unique_hs}/{len(health_scores)}")
    print(f"    Unique probabilities: {unique_probs}/{len(probs)}")
    print(f"    Unique RUL values:    {unique_ruls}/{len(ruls)}")

    data_changes = unique_ts > 1
    if data_changes:
        print(f"    [OK]   Data IS changing between ticks (cursor advancing)")
    else:
        print(f"    [WARN] Data NOT changing between ticks (cursor may be stuck)")

    # Check timestamp ordering (should be chronological)
    ts_ordered = all(data_timestamps[i] <= data_timestamps[i+1] for i in range(len(data_timestamps)-1) if data_timestamps[i] != "N/A" and data_timestamps[i+1] != "N/A")
    if ts_ordered:
        print(f"    [OK]   Timestamps are in chronological order")
    else:
        print(f"    [WARN] Timestamps NOT in chronological order (cursor may have wrapped)")

    # Quick test: connect to all turbines briefly
    print(f"\n--- Quick Connect Test: All Turbines ---")
    for aid in VALID_ASSET_IDS:
        try:
            import websockets
            async with websockets.connect(BASE_URL) as ws:
                await ws.send(json.dumps({"turbine_id": aid}))
                raw = await asyncio.wait_for(ws.recv(), timeout=15.0)
                data = json.loads(raw)
                if "error" in data:
                    print(f"  [FAIL] Asset {aid:>2}: Error -- {data['error']}")
                else:
                    hs = data.get("health_score", "?")
                    prob = data.get("probability", "?")
                    ts = data.get("timestamp", "?")
                    print(f"  [OK]   Asset {aid:>2}: health={hs}, prob={prob}, ts={ts}")
        except Exception as e:
            print(f"  [FAIL] Asset {aid:>2}: {e}")

    # Test invalid turbine ID (the 422 scenario)
    print(f"\n--- Invalid Turbine ID Test (422 scenario) ---")
    for bad_id in [-1, 999, 3, 14]:
        try:
            import websockets
            async with websockets.connect(BASE_URL) as ws:
                await ws.send(json.dumps({"turbine_id": bad_id}))
                raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
                data = json.loads(raw)
                if "error" in data:
                    print(f"  [OK]   ID={bad_id:>3}: Properly rejected -- {data['error']}")
                else:
                    print(f"  [WARN] ID={bad_id:>3}: Accepted (unexpected)")
        except Exception as e:
            print(f"  [OK]   ID={bad_id:>3}: Connection rejected -- {type(e).__name__}")

    return data_changes


# ═══════════════════════════════════════════════════════════════════════════
# PART 3: REST API CONSISTENCY CHECK
# ═══════════════════════════════════════════════════════════════════════════

def test_rest_consistency():
    """Check REST endpoints return consistent data types."""
    import urllib.request

    print(f"\n{'='*70}")
    print("PART 3: REST API DATA CONSISTENCY CHECK")
    print(f"{'='*70}")

    all_ok = True

    # Test /api/fleet/current
    print(f"\n--- /api/fleet/current ---")
    try:
        with urllib.request.urlopen(f"{REST_URL}/api/fleet/current") as resp:
            fleet = json.loads(resp.read())

        print(f"  [INFO] Returned {len(fleet)} turbines")
        returned_ids = sorted([t["asset_id"] for t in fleet])
        print(f"  [INFO] Asset IDs: {returned_ids}")
        print(f"  [INFO] Expected:  {VALID_ASSET_IDS}")

        if returned_ids != VALID_ASSET_IDS:
            print(f"  [WARN] Asset ID mismatch in fleet/current!")
            all_ok = False
        else:
            print(f"  [OK]   Asset IDs match")

        # Check each turbine's data for NaN/None issues
        for t in fleet:
            aid = t["asset_id"]
            issues = []
            if t.get("failure_probability") is None:
                issues.append("failure_probability=None")
            if t.get("predicted_rul") is None:
                issues.append("predicted_rul=None")
            if t.get("health_score") is None:
                issues.append("health_score=None")

            sensors = t.get("sensors", {})
            for key, val in sensors.items():
                if val is None:
                    issues.append(f"sensor.{key}=None")

            readings = t.get("recent_readings", [])
            if len(readings) == 0:
                issues.append("no recent_readings")

            if issues:
                print(f"  [WARN] Asset {aid}: {', '.join(issues)}")
                all_ok = False
            else:
                print(f"  [OK]   Asset {aid}: All fields populated, {len(readings)} readings")

    except Exception as e:
        print(f"  [FAIL] Error: {e}")
        all_ok = False

    # Test individual turbine endpoints
    print(f"\n--- /api/turbine/<id> per-turbine check ---")
    for aid in VALID_ASSET_IDS:
        try:
            with urllib.request.urlopen(f"{REST_URL}/api/turbine/{aid}") as resp:
                data = json.loads(resp.read())
            hs = data.get("health_score")
            prob = data.get("failure_probability")
            rul = data.get("predicted_rul")
            print(f"  [OK]   Asset {aid:>2}: health={hs}, prob={prob}, rul={rul}")
        except Exception as e:
            print(f"  [FAIL] Asset {aid:>2}: {e}")
            all_ok = False

    # Test that invalid IDs return proper errors (not 422/500)
    print(f"\n--- Invalid ID rejection test ---")
    for bad_id in ["NaN", "T-00", "abc", "3", "14"]:
        try:
            url = f"{REST_URL}/api/turbine/{bad_id}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                print(f"  [WARN] ID='{bad_id}': Returned 200 (should be 404/422)")
        except urllib.error.HTTPError as e:
            print(f"  [OK]   ID='{bad_id}': HTTP {e.code} -- {e.reason}")
        except Exception as e:
            print(f"  [OK]   ID='{bad_id}': Rejected -- {e}")

    return all_ok


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Wind Farm A -- WebSocket + Database Consistency Test Suite")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {DB_PATH}")
    print()

    # Part 1: Database audit (no server needed)
    db_ok = audit_database()

    # Part 3: REST API check (needs server)
    rest_ok = test_rest_consistency()

    # Part 2: WebSocket test (needs server, takes ~60 seconds)
    ws_ok = asyncio.run(run_websocket_tests())

    # Final summary
    print(f"\n{'='*70}")
    print("FINAL SUMMARY")
    print(f"{'='*70}")
    print(f"  Database Consistency: {'PASS' if db_ok else 'ISSUES FOUND'}")
    print(f"  REST API Consistency: {'PASS' if rest_ok else 'ISSUES FOUND'}")
    print(f"  WebSocket Real-time:  {'PASS' if ws_ok else 'ISSUES FOUND'}")
    print(f"{'='*70}")
