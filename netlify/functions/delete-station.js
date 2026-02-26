import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE'
    };

    if (req.method === 'OPTIONS') {
        return new Response('OK', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    // Security check
    const url = new URL(req.url);
    let authHeader = req.headers.get('authorization') ||
        req.headers.get('x-api-key') ||
        url.searchParams.get('key') || "";

    if (authHeader.startsWith('Bearer ')) {
        authHeader = authHeader.substring(7);
    }

    const SECRET_KEY = process.env.FLOOD_API_KEY;
    if (!SECRET_KEY) {
        return new Response('Server Configuration Error', { status: 500, headers: corsHeaders });
    }

    if (authHeader.trim() !== SECRET_KEY.trim()) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { station } = body;

        if (!station) {
            return new Response('Station name required', { status: 400, headers: corsHeaders });
        }

        const stationKey = station.toLowerCase().trim();
        const store = getStore("flood_data");
        const historyStore = getStore("flood_history");

        // 1. Remove from stations_data
        let stations = await store.get("stations_data", { type: "json" }) || {};
        if (stations[stationKey]) {
            delete stations[stationKey];
            await store.setJSON("stations_data", stations);
        }

        // 2. Remove history
        try {
            await historyStore.delete(`history_${stationKey}`);
        } catch (e) {
            console.warn(`Failed to delete history for ${stationKey}:`, e.message);
        }

        return new Response(JSON.stringify({ success: true, deleted: station }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Delete failed', details: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};
