const API_BASE = '/api';

function validateTurbineId(id: number | string): number {
    const n = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(n)) throw new Error(`Invalid turbine ID: ${id}`);
    return n;
}

// ===== REST API Functions =====

export async function fetchHealthCheck() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
}

export async function fetchFleetCurrent() {
    const res = await fetch(`${API_BASE}/fleet/current`);
    if (!res.ok) throw new Error(`Fleet current failed: ${res.status}`);
    return res.json();
}

export async function fetchTurbine(id: number | string) {
    const numId = validateTurbineId(id);
    const res = await fetch(`${API_BASE}/turbine/${numId}`);
    if (!res.ok) throw new Error(`Turbine ${numId} failed: ${res.status}`);
    return res.json();
}

export async function fetchTurbineHistory(id: number | string, days: number = 30) {
    const numId = validateTurbineId(id);
    const res = await fetch(`${API_BASE}/turbine/${numId}/history?days=${days}`);
    if (!res.ok) throw new Error(`Turbine ${numId} history failed: ${res.status}`);
    return res.json();
}

export async function fetchTurbineShap(id: number | string) {
    const numId = validateTurbineId(id);
    const res = await fetch(`${API_BASE}/turbine/${numId}/shap`);
    if (!res.ok) throw new Error(`Turbine ${numId} shap failed: ${res.status}`);
    return res.json();
}

export async function fetchFleetSummary() {
    const res = await fetch(`${API_BASE}/fleet/summary`);
    if (!res.ok) throw new Error(`Fleet summary failed: ${res.status}`);
    return res.json();
}

export async function fetchBusinessMetrics() {
    const res = await fetch(`${API_BASE}/business/metrics`);
    if (!res.ok) throw new Error(`Business metrics failed: ${res.status}`);
    return res.json();
}

// ===== Dispatch (n8n) =====

export async function dispatchMaintenance(turbineId: number | string, fault?: string) {
    const numId = validateTurbineId(turbineId);
    const res = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turbine_id: numId, fault: fault || null }),
    });
    if (!res.ok) throw new Error(`Dispatch failed: ${res.status}`);
    return res.json();
}

// ===== WebSocket =====

export function createLiveSocket(
    turbineId: number,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void
): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/live`);

    ws.onopen = () => {
        ws.send(JSON.stringify({ turbine_id: turbineId }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
    };

    return ws;
}
