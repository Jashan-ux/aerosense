"""
cache.py — Redis-first, in-memory-fallback cache layer.

Usage:
    await cache_set("key", value, ttl=10)
    value = await cache_get("key")         # returns None on miss
    await cache_del("key")

The cursor store (playback position per turbine) is also managed here:
    cursor = await cursor_get(asset_id)    # int row_id
    await cursor_set(asset_id, row_id)
"""

import json
import time
import asyncio
from typing import Any, Optional

# ── optional Redis ──────────────────────────────────────────────────────────
try:
    import redis.asyncio as aioredis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False

_redis: Optional[Any] = None          # aioredis.Redis | None
_mem: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at); 0 = never
_cursors: dict[int, int] = {}           # asset_id → current row_id


async def init_cache(redis_url: str = "redis://localhost:6379") -> bool:
    """
    Try to connect to Redis. Falls back to in-memory silently.
    Returns True if Redis is live, False if using in-memory fallback.
    """
    global _redis
    if not _REDIS_AVAILABLE:
        print("[cache] redis-py not installed — using in-memory cache")
        return False
    try:
        client = aioredis.from_url(redis_url, decode_responses=True,
                                   socket_connect_timeout=2,
                                   socket_timeout=2)
        await client.ping()
        _redis = client
        print("[cache] Redis connected")
        return True
    except Exception as e:
        _redis = None
        print(f"[cache] Redis unavailable ({e}) — using in-memory cache")
        return False


async def close_cache():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── generic get/set/del ────────────────────────────────────────────────────

async def cache_set(key: str, value: Any, ttl: int = 10) -> None:
    """Store JSON-serializable value with TTL seconds (0 = no expiry)."""
    serialized = json.dumps(value, default=str)
    if _redis:
        try:
            if ttl > 0:
                await _redis.setex(key, ttl, serialized)
            else:
                await _redis.set(key, serialized)
            return
        except Exception:
            pass  # Redis error → fall through to memory
    # in-memory fallback
    expires_at = (time.monotonic() + ttl) if ttl > 0 else 0.0
    _mem[key] = (value, expires_at)


async def cache_get(key: str) -> Optional[Any]:
    """Return cached value or None on miss / expired."""
    if _redis:
        try:
            raw = await _redis.get(key)
            if raw is not None:
                return json.loads(raw)
            return None
        except Exception:
            pass  # Redis error → fall through to memory

    # in-memory fallback
    entry = _mem.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if expires_at > 0 and time.monotonic() > expires_at:
        del _mem[key]
        return None
    return value


async def cache_del(key: str) -> None:
    if _redis:
        try:
            await _redis.delete(key)
        except Exception:
            pass
    _mem.pop(key, None)


# ── cursor store (playback position per turbine) ───────────────────────────

CURSOR_PREFIX = "cursor:"


async def cursor_get(asset_id: int) -> Optional[int]:
    val = await cache_get(f"{CURSOR_PREFIX}{asset_id}")
    if val is not None:
        return int(val)
    return _cursors.get(asset_id)


async def cursor_set(asset_id: int, row_id: int) -> None:
    _cursors[asset_id] = row_id
    await cache_set(f"{CURSOR_PREFIX}{asset_id}", row_id, ttl=0)  # no expiry


# ── TTL constants (used by route handlers) ────────────────────────────────

TTL_LIVE      = 8    # fleet/current, turbine/{id}
TTL_HISTORY   = 60   # turbine history
TTL_SHAP      = 300  # SHAP (expensive)
TTL_BUSINESS  = 300  # business metrics (static)
TTL_SUMMARY   = 8    # fleet summary
