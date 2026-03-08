"""
ws_manager.py — WebSocket connection manager + 10-second ticker

Architecture:
  - Global ConnectionManager holds a dict: asset_id -> set of WebSocket clients
  - A single background asyncio task ticks every TICK_INTERVAL seconds
  - On each tick it advances the cursor by CURSOR_STEP for every subscribed asset
  - Then broadcasts a LiveUpdate JSON payload to every subscriber
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket

log = logging.getLogger("ws_manager")

TICK_INTERVAL = 10    # seconds between live updates
CURSOR_STEP   = 1     # advance by this many readings per tick


class ConnectionManager:
    def __init__(self):
        # asset_id -> set of active WebSocket connections
        self._subs: Dict[int, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, asset_id: int, ws: WebSocket):
        async with self._lock:
            self._subs[asset_id].add(ws)
        log.info(f"[WS] subscribed asset={asset_id}  total={sum(len(s) for s in self._subs.values())}")

    async def unsubscribe(self, asset_id: int, ws: WebSocket):
        async with self._lock:
            self._subs[asset_id].discard(ws)
            if not self._subs[asset_id]:
                del self._subs[asset_id]
        log.info(f"[WS] unsubscribed asset={asset_id}")

    def subscribed_asset_ids(self) -> list[int]:
        return list(self._subs.keys())

    async def broadcast(self, asset_id: int, payload: dict):
        """Send payload to all clients subscribed to asset_id. Remove dead sockets."""
        dead: list[WebSocket] = []
        async with self._lock:
            targets = list(self._subs.get(asset_id, set()))

        for ws in targets:
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.unsubscribe(asset_id, ws)

    async def broadcast_all(self, payloads: Dict[int, dict]):
        """Broadcast one payload per asset to its subscribers."""
        tasks = [self.broadcast(aid, payload) for aid, payload in payloads.items()]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


manager = ConnectionManager()


async def ws_ticker_loop(build_live_payload):
    """
    Infinite loop: every TICK_INTERVAL seconds
    1. For every subscribed asset, advance its cursor by CURSOR_STEP
    2. Build a LiveUpdate payload
    3. Broadcast to all subscribers of that asset
    `build_live_payload` is an async callable: async def(asset_id) -> dict
    """
    log.info("[ws_ticker] started")
    while True:
        await asyncio.sleep(TICK_INTERVAL)
        active = manager.subscribed_asset_ids()
        if not active:
            continue
        payloads: Dict[int, dict] = {}
        for asset_id in active:
            try:
                payload = await build_live_payload(asset_id)
                if payload:
                    payloads[asset_id] = payload
            except Exception as exc:
                log.error(f"[ws_ticker] build_live_payload error for asset {asset_id}: {exc}")
        await manager.broadcast_all(payloads)
