import { useState, useEffect, useRef } from 'react';
import { createLiveSocket } from '../api';
import { LiveUpdate } from '../types';

export function useWebSocket(turbineId: string | undefined) {
    const [lastUpdate, setLastUpdate] = useState<LiveUpdate | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!turbineId) return;

        const id = parseInt(turbineId, 10);
        if (isNaN(id)) return;

        const connect = () => {
            try {
                const ws = createLiveSocket(
                    id,
                    (data) => {
                        if (data.error) {
                            setError(data.error);
                        } else {
                            setLastUpdate(data);
                            setError(null);
                        }
                    },
                    (err) => {
                        setIsConnected(false);
                        setError('WebSocket connection error');
                    }
                );

                ws.addEventListener('open', () => {
                    setIsConnected(true);
                    setError(null);
                    console.log(`[WebSocket] Connected to turbine ${id}`);
                });

                ws.addEventListener('close', () => {
                    setIsConnected(false);
                    console.log(`[WebSocket] Disconnected from turbine ${id}`);
                });

                socketRef.current = ws;
            } catch (err) {
                setError('Failed to create WebSocket');
                setIsConnected(false);
            }
        };

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [turbineId]);

    return { lastUpdate, isConnected, error };
}
