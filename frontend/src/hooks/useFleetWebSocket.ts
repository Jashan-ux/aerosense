import { useEffect, useMemo, useRef, useState } from 'react';
import { createLiveSocket } from '../api';
import type { LiveUpdate } from '../types';

type LiveUpdateMap = Record<string, LiveUpdate>;

export function useFleetWebSocket(turbineIds: string[]) {
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdateMap>({});
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());

  const normalizedIds = useMemo(() => {
    return Array.from(new Set(turbineIds.filter(id => !isNaN(parseInt(id, 10)))));
  }, [turbineIds]);

  useEffect(() => {
    const targetIds = new Set(normalizedIds);

    // Close sockets for turbines no longer on screen.
    for (const [id, ws] of socketsRef.current.entries()) {
      if (!targetIds.has(id)) {
        ws.close();
        socketsRef.current.delete(id);
      }
    }

    // Open sockets for newly visible turbines.
    for (const id of normalizedIds) {
      if (socketsRef.current.has(id)) continue;

      const numericId = parseInt(id, 10);
      const ws = createLiveSocket(
        numericId,
        (data) => {
          if (data?.type === 'ping' || data?.error) return;
          setLiveUpdates(prev => ({ ...prev, [id]: data as LiveUpdate }));
        },
        () => {
          setConnectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      );

      ws.addEventListener('open', () => {
        setConnectedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      });

      ws.addEventListener('close', () => {
        setConnectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });

      socketsRef.current.set(id, ws);
    }

    return () => {
      for (const ws of socketsRef.current.values()) {
        ws.close();
      }
      socketsRef.current.clear();
      setConnectedIds(new Set());
    };
  }, [normalizedIds]);

  return {
    liveUpdates,
    connectedCount: connectedIds.size,
    isAnyConnected: connectedIds.size > 0,
  };
}
