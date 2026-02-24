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

        // Also keep "latest_status" compatible for now
        await store.setJSON("latest_status", sensorData);
        await store.setJSON("stations_data", stations);

        return new Response(JSON.stringify({ success: true, updated: station, data: sensorData }), {
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
