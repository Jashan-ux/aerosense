"""
test_api.py -- Backend API Integration Tests
=============================================
Tests all 7 REST endpoints + WebSocket /ws/live.

Usage:
    python test_api.py                  # default: http://127.0.0.1:8000
    python test_api.py --base-url http://host:port
"""

import argparse
import asyncio
import json
import sys
import time
import traceback

try:
    import requests
except ImportError:
    print("[FATAL] 'requests' package required.  pip install requests")
    sys.exit(1)

try:
    import websockets
    HAS_WS = True
except ImportError:
    HAS_WS = False

# ── config ──────────────────────────────────────────────────────────────────
VALID_ASSET_IDS = [0, 10, 11, 13, 21]
RUL_CAP = 180.0
TIMEOUT = 15  # seconds per request

passed = 0
failed = 0
errors = []


# ── helpers ─────────────────────────────────────────────────────────────────

def ok(name: str, detail: str = ""):
    global passed
    passed += 1
    tag = f"  {detail}" if detail else ""
    print(f"  [PASS] {name}{tag}")


def fail(name: str, reason: str):
    global failed
    failed += 1
    errors.append((name, reason))
    print(f"  [FAIL] {name} -- {reason}")


def assert_status(resp, expected: int, name: str) -> bool:
    if resp.status_code != expected:
        fail(name, f"expected {expected}, got {resp.status_code}")
        return False
    return True


def assert_key(data, key: str, name: str) -> bool:
    if key not in data:
        fail(name, f"missing key '{key}'")
        return False
    return True


def assert_type(value, expected_type, name: str, key: str) -> bool:
    if not isinstance(value, expected_type):
        fail(name, f"'{key}' expected {expected_type.__name__}, got {type(value).__name__}")
        return False
    return True


# ═════════════════════════════════════════════════════════════════════════════
# TEST CASES
# ═════════════════════════════════════════════════════════════════════════════

def test_health(base: str):
    name = "GET /api/health"
    print(f"\n{'='*60}\n{name}\n{'='*60}")
    try:
        r = requests.get(f"{base}/api/health", timeout=TIMEOUT)
        if not assert_status(r, 200, name):
            return
        data = r.json()

        # validate shape
        for key in ("status", "assets", "rul_cap"):
            if not assert_key(data, key, name):
                return

        if data["status"] != "ok":
            fail(name, f"status={data['status']}, expected 'ok'")
            return

        if sorted(data["assets"]) != sorted(VALID_ASSET_IDS):
            fail(name, f"assets={data['assets']}, expected {VALID_ASSET_IDS}")
            return

        if data["rul_cap"] != RUL_CAP:
            fail(name, f"rul_cap={data['rul_cap']}, expected {RUL_CAP}")
            return

        ok(name, f"status=ok, assets={data['assets']}, rul_cap={data['rul_cap']}")
    except Exception as e:
        fail(name, str(e))


def test_fleet_current(base: str):
    name = "GET /api/fleet/current"
    print(f"\n{'='*60}\n{name}\n{'='*60}")
    try:
        r = requests.get(f"{base}/api/fleet/current", timeout=TIMEOUT)
        if not assert_status(r, 200, name):
            return
        data = r.json()

        if not assert_type(data, list, name, "response"):
            return

        if len(data) != len(VALID_ASSET_IDS):
            fail(name, f"expected {len(VALID_ASSET_IDS)} turbines, got {len(data)}")
            return

        ok(name, f"returned {len(data)} turbines")

        # validate each turbine prediction shape
        required_keys = ["asset_id", "timestamp", "failure_probability",
                         "predicted_failure", "predicted_rul", "health_score",
                         "sensors", "recent_readings"]
        sensor_keys = ["gearbox_temp", "generator_temp", "wind_speed",
                       "vibration", "rpm", "power_output"]

        for turbine in data:
            tid = turbine.get("asset_id", "?")
            sub = f"{name} [turbine {tid}]"

            for key in required_keys:
                if not assert_key(turbine, key, sub):
                    return

            # sensor sub-keys
            sensors = turbine.get("sensors", {})
            for sk in sensor_keys:
                if sk not in sensors:
                    fail(sub, f"missing sensor '{sk}'")
                    return

            # recent_readings should be a list of up to 20
            readings = turbine.get("recent_readings", [])
            if not isinstance(readings, list) or len(readings) == 0:
                fail(sub, f"recent_readings is empty or not a list")
                return

            if len(readings) > 20:
                fail(sub, f"recent_readings has {len(readings)} entries (max 20)")
                return

            # validate reading shape
            r0 = readings[0]
            for rk in ("timestamp", "health_score", "failure_probability",
                       "predicted_rul", "sensors"):
                if rk not in r0:
                    fail(sub, f"reading missing key '{rk}'")
                    return

            # value range checks
            hs = turbine["health_score"]
            if not (0 <= hs <= 100):
                fail(sub, f"health_score={hs} out of [0,100]")
                return

            fp = turbine["failure_probability"]
            if not (0 <= fp <= 1):
                fail(sub, f"failure_probability={fp} out of [0,1]")
                return

            ok(sub, f"health={hs}%, readings={len(readings)}")

    except Exception as e:
        fail(name, str(e))


def test_turbine_single(base: str):
    name = "GET /api/turbine/{id}"
    print(f"\n{'='*60}\n{name}\n{'='*60}")

    # test valid IDs
    for tid in VALID_ASSET_IDS:
        sub = f"{name} [id={tid}]"
        try:
            r = requests.get(f"{base}/api/turbine/{tid}", timeout=TIMEOUT)
            if not assert_status(r, 200, sub):
                continue
            data = r.json()

            if data.get("asset_id") != tid:
                fail(sub, f"returned asset_id={data.get('asset_id')}, expected {tid}")
                continue

            readings = data.get("recent_readings", [])
            ok(sub, f"rul={data.get('predicted_rul')}, readings={len(readings)}")
        except Exception as e:
            fail(sub, str(e))

    # test invalid ID -> 404
    sub = f"{name} [id=999 -> 404]"
    try:
        r = requests.get(f"{base}/api/turbine/999", timeout=TIMEOUT)
        if r.status_code == 404:
            ok(sub)
        else:
            fail(sub, f"expected 404, got {r.status_code}")
    except Exception as e:
        fail(sub, str(e))

    # test NaN -> 422
    sub = f"{name} [id=NaN -> 422]"
    try:
        r = requests.get(f"{base}/api/turbine/NaN", timeout=TIMEOUT)
        if r.status_code == 422:
            ok(sub)
        else:
            fail(sub, f"expected 422, got {r.status_code}")
    except Exception as e:
        fail(sub, str(e))


def test_turbine_history(base: str):
    name = "GET /api/turbine/{id}/history"
    print(f"\n{'='*60}\n{name}\n{'='*60}")

    for tid in VALID_ASSET_IDS[:2]:  # test first 2 to save time
        sub = f"{name} [id={tid}, days=7]"
        try:
            r = requests.get(f"{base}/api/turbine/{tid}/history",
                             params={"days": 7}, timeout=TIMEOUT)
            if not assert_status(r, 200, sub):
                continue
            data = r.json()

            if not assert_key(data, "turbine_id", sub):
                continue
            if not assert_key(data, "data", sub):
                continue

            if data["turbine_id"] != tid:
                fail(sub, f"turbine_id={data['turbine_id']}, expected {tid}")
                continue

            rows = data["data"]
            if not isinstance(rows, list):
                fail(sub, f"'data' is not a list")
                continue

            ok(sub, f"rows={len(rows)}")
        except Exception as e:
            fail(sub, str(e))

    # test default days param
    sub = f"{name} [id=0, default days]"
    try:
        r = requests.get(f"{base}/api/turbine/0/history", timeout=TIMEOUT)
        if assert_status(r, 200, sub):
            data = r.json()
            ok(sub, f"rows={len(data.get('data', []))}")
    except Exception as e:
        fail(sub, str(e))

    # invalid turbine
    sub = f"{name} [id=999 -> 404]"
    try:
        r = requests.get(f"{base}/api/turbine/999/history", timeout=TIMEOUT)
        if r.status_code == 404:
            ok(sub)
        else:
            fail(sub, f"expected 404, got {r.status_code}")
    except Exception as e:
        fail(sub, str(e))


def test_turbine_shap(base: str):
    name = "GET /api/turbine/{id}/shap"
    print(f"\n{'='*60}\n{name}\n{'='*60}")

    for tid in VALID_ASSET_IDS[:2]:
        sub = f"{name} [id={tid}]"
        try:
            r = requests.get(f"{base}/api/turbine/{tid}/shap", timeout=TIMEOUT)
            if not assert_status(r, 200, sub):
                continue
            data = r.json()

            for key in ("prediction", "baseline", "top_features"):
                if not assert_key(data, key, sub):
                    return

            features = data["top_features"]
            if not isinstance(features, list):
                fail(sub, "top_features is not a list")
                continue

            if len(features) > 0:
                f0 = features[0]
                for fk in ("feature", "description", "value", "shap_value", "impact"):
                    if fk not in f0:
                        fail(sub, f"feature entry missing key '{fk}'")
                        return

                # impact should be 'positive' or 'negative'
                if f0["impact"] not in ("positive", "negative"):
                    fail(sub, f"impact='{f0['impact']}', expected 'positive'|'negative'")
                    return

            ok(sub, f"features={len(features)}, prediction={data['prediction']}")
        except Exception as e:
            fail(sub, str(e))

    # invalid turbine
    sub = f"{name} [id=999 -> 404]"
    try:
        r = requests.get(f"{base}/api/turbine/999/shap", timeout=TIMEOUT)
        if r.status_code == 404:
            ok(sub)
        else:
            fail(sub, f"expected 404, got {r.status_code}")
    except Exception as e:
        fail(sub, str(e))


def test_fleet_summary(base: str):
    name = "GET /api/fleet/summary"
    print(f"\n{'='*60}\n{name}\n{'='*60}")
    try:
        r = requests.get(f"{base}/api/fleet/summary", timeout=TIMEOUT)
        if not assert_status(r, 200, name):
            return
        data = r.json()

        required = ["total_turbines", "critical_count", "warning_count",
                     "healthy_count", "avg_health", "total_savings",
                     "failures_prevented"]
        for key in required:
            if not assert_key(data, key, name):
                return

        if data["total_turbines"] != len(VALID_ASSET_IDS):
            fail(name, f"total_turbines={data['total_turbines']}, expected {len(VALID_ASSET_IDS)}")
            return

        # counts should sum to total
        count_sum = data["critical_count"] + data["warning_count"] + data["healthy_count"]
        if count_sum != data["total_turbines"]:
            fail(name, f"status counts sum={count_sum}, total={data['total_turbines']}")
            return

        if not (0 <= data["avg_health"] <= 100):
            fail(name, f"avg_health={data['avg_health']} out of [0,100]")
            return

        if data["total_savings"] <= 0:
            fail(name, f"total_savings={data['total_savings']} should be > 0")
            return

        ok(name, f"turbines={data['total_turbines']}, health={data['avg_health']}%, "
                 f"savings=EUR {data['total_savings']:,.0f}")
    except Exception as e:
        fail(name, str(e))


def test_business_metrics(base: str):
    name = "GET /api/business/metrics"
    print(f"\n{'='*60}\n{name}\n{'='*60}")
    try:
        r = requests.get(f"{base}/api/business/metrics", timeout=TIMEOUT)
        if not assert_status(r, 200, name):
            return
        data = r.json()

        required = ["total_savings", "cost_avoidance", "false_alarm_costs",
                     "roi", "failures_prevented", "confusion_matrix",
                     "roc_auc", "pr_auc"]
        for key in required:
            if not assert_key(data, key, name):
                return

        # confusion matrix shape
        cm = data["confusion_matrix"]
        for cm_key in ("true_positive", "false_positive", "true_negative", "false_negative"):
            if cm_key not in cm:
                fail(name, f"confusion_matrix missing '{cm_key}'")
                return

        if not (0 <= data["roc_auc"] <= 1):
            fail(name, f"roc_auc={data['roc_auc']} out of [0,1]")
            return

        if not (0 <= data["pr_auc"] <= 1):
            fail(name, f"pr_auc={data['pr_auc']} out of [0,1]")
            return

        if data["roi"] <= 0:
            fail(name, f"roi={data['roi']} should be > 0")
            return

        ok(name, f"savings=EUR {data['total_savings']:,.0f}, roi={data['roi']}%, "
                 f"roc_auc={data['roc_auc']}")
    except Exception as e:
        fail(name, str(e))


def test_response_time(base: str):
    """Measure latency on key endpoints (informational, not pass/fail)."""
    name = "LATENCY BENCHMARKS"
    print(f"\n{'='*60}\n{name}\n{'='*60}")
    endpoints = [
        ("GET /api/health",           f"{base}/api/health"),
        ("GET /api/fleet/current",    f"{base}/api/fleet/current"),
        ("GET /api/turbine/0",        f"{base}/api/turbine/0"),
        ("GET /api/turbine/0/history", f"{base}/api/turbine/0/history?days=7"),
        ("GET /api/turbine/0/shap",   f"{base}/api/turbine/0/shap"),
        ("GET /api/fleet/summary",    f"{base}/api/fleet/summary"),
        ("GET /api/business/metrics", f"{base}/api/business/metrics"),
    ]
    for label, url in endpoints:
        try:
            t0 = time.perf_counter()
            r = requests.get(url, timeout=TIMEOUT)
            elapsed = (time.perf_counter() - t0) * 1000
            status = r.status_code
            tag = "OK" if status == 200 else f"HTTP {status}"
            threshold = "(<10s target)" if elapsed < 10_000 else "(SLOW >10s)"
            print(f"  {label:35s} {elapsed:7.0f} ms  {tag}  {threshold}")
        except Exception as e:
            print(f"  {label:35s}      ERR  {e}")


async def test_websocket(base: str):
    name = "WS /ws/live"
    print(f"\n{'='*60}\n{name}\n{'='*60}")

    if not HAS_WS:
        print("  [SKIP] 'websockets' package not installed.  pip install websockets")
        return

    ws_url = base.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/ws/live"

    # Test 1: valid subscription
    sub = f"{name} [subscribe turbine 0]"
    try:
        async with websockets.connect(ws_url, close_timeout=5) as ws:
            # send subscription
            await ws.send(json.dumps({"turbine_id": 0}))

            # wait for first message (immediate payload)
            raw = await asyncio.wait_for(ws.recv(), timeout=15)
            data = json.loads(raw)

            if "error" in data:
                fail(sub, f"server error: {data['error']}")
                return

            for key in ("turbine_id", "timestamp", "health_score",
                        "probability", "rul", "sensors"):
                if key not in data:
                    fail(sub, f"missing key '{key}'")
                    return

            if data["turbine_id"] != 0:
                fail(sub, f"turbine_id={data['turbine_id']}, expected 0")
                return

            sensors = data.get("sensors", {})
            for sk in ("gearbox_temp", "vibration", "wind_speed", "power_output"):
                if sk not in sensors:
                    fail(sub, f"sensors missing '{sk}'")
                    return

            ok(sub, f"health={data['health_score']}%, rul={data['rul']}")

            # Test 2: wait for a second tick (up to 15s)
            sub2 = f"{name} [receive tick update]"
            try:
                raw2 = await asyncio.wait_for(ws.recv(), timeout=15)
                data2 = json.loads(raw2)
                if data2.get("type") == "ping":
                    ok(sub2, "received keep-alive ping")
                elif "turbine_id" in data2:
                    ok(sub2, f"received live update, ts={data2.get('timestamp')}")
                else:
                    ok(sub2, f"received message: {list(data2.keys())}")
            except asyncio.TimeoutError:
                fail(sub2, "no second message within 15s")

    except Exception as e:
        fail(sub, f"{type(e).__name__}: {e}")

    # Test 3: invalid turbine ID
    sub3 = f"{name} [invalid turbine -> error]"
    try:
        async with websockets.connect(ws_url, close_timeout=5) as ws:
            await ws.send(json.dumps({"turbine_id": 999}))
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(raw)
            if "error" in data:
                ok(sub3, f"got expected error: {data['error'][:50]}")
            else:
                fail(sub3, "no error returned for invalid turbine")
    except Exception as e:
        fail(sub3, f"{type(e).__name__}: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Wind Farm A -- API Test Suite")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000",
                        help="Backend base URL (default: http://127.0.0.1:8000)")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    print(f"\nWind Farm A -- Backend API Test Suite")
    print(f"Target: {base}")
    print(f"{'='*60}")

    # check server is reachable
    try:
        requests.get(f"{base}/api/health", timeout=5)
    except requests.ConnectionError:
        print(f"\n[FATAL] Cannot connect to {base}")
        print(f"        Make sure the backend is running:")
        print(f"          cd backend && python main.py")
        sys.exit(1)

    # run REST tests
    test_health(base)
    test_fleet_current(base)
    test_turbine_single(base)
    test_turbine_history(base)
    test_turbine_shap(base)
    test_fleet_summary(base)
    test_business_metrics(base)

    # latency benchmarks
    test_response_time(base)

    # run WebSocket test
    asyncio.run(test_websocket(base))

    # summary
    total = passed + failed
    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")
    print(f"{'='*60}")

    if errors:
        print("\nFailed tests:")
        for name, reason in errors:
            print(f"  - {name}: {reason}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
