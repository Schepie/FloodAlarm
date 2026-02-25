import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // Security check
    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization') || url.searchParams.get('key');
    const SECRET_KEY = process.env.FLOOD_API_KEY || "change_me_later";

    if (authHeader !== SECRET_KEY) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { distance, warning, alarm, status, forecast, rainExpected, station = "Antwerpen" } = body;

        const sensorData = {
            distance,
            warning,
            alarm,
            status,
            forecast,
            rainExpected,
            lastSeen: new Date().toISOString()
        };

        const store = getStore("flood_data");

        // Get existing stations data or start fresh
        let stations = await store.get("stations_data", { type: "json" }) || {};

        // Update the specific station
        stations[station] = sensorData;

        // --- History Logic ---
        const historyStore = getStore("flood_history");
        const historyKey = `history_${station}`;
        let history = await historyStore.get(historyKey, { type: "json" }) || [];

        // Add new entry
        history.push({ ts: sensorData.lastSeen, val: distance });

        // Filter to keep only last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        history = history.filter(entry => entry.ts > twentyFourHoursAgo);

        // Limit to reasonable number of points (e.g., 200 points to keep blob small)
        // If we push every 15s, 24h = 5760 points. Let's keep more but maybe downsample later if needed.
        // For now, let's just keep the last 200 points or so for the graph.
        // Actually, if we want 24h trend, we might need more. Let's cap at 500 for now.
        if (history.length > 500) {
            history = history.slice(-500);
        }

        await historyStore.setJSON(historyKey, history);
        // --- End History Logic ---

        // Also keep "latest_status" compatible for now
        await store.setJSON("latest_status", sensorData);
        await store.setJSON("stations_data", stations);

        return new Response(JSON.stringify({ success: true, updated: station, data: sensorData, historyCount: history.length }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Update failed', details: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
};
