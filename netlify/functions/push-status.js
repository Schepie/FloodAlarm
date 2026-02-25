import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

    // Support Bearer token format
    if (authHeader.startsWith('Bearer ')) {
        authHeader = authHeader.substring(7);
    }

    const SECRET_KEY = process.env.FLOOD_API_KEY;

    if (!SECRET_KEY) {
        console.error("[Auth] CRITICAL: FLOOD_API_KEY is not set in Netlify Environment Variables!");
        return new Response('Server Configuration Error: FLOOD_API_KEY missing in Netlify settings', { status: 500, headers: corsHeaders });
    }

    // Trim whitespace to avoid common "copy-paste" errors
    const normalizedAuth = authHeader.trim();

    if (normalizedAuth !== SECRET_KEY.trim()) {
        const expectedHint = SECRET_KEY.trim().substring(0, 3);
        const receivedHint = normalizedAuth.substring(0, 3);
        console.warn(`[Auth] Unauthorized attempt. Expected: ${expectedHint}... Received: ${receivedHint}...`);
        return new Response(`Unauthorized: API Key mismatch. Server expected starts with "${expectedHint}", but received starts with "${receivedHint}". Check your Netlify Env vs Dashboard Settings.`, { status: 401, headers: corsHeaders });
    }


    try {
        const body = await req.json();
        const { distance, warning, alarm, status, forecast, rainExpected, station = "Antwerpen", river = "Schelde", intervals, isUiUpdate } = body;

        const store = getStore("flood_data");

        // Get existing stations data or start fresh
        let stations = await store.get("stations_data", { type: "json" }) || {};
        const existingData = stations[station] || {};

        // Configuration (Thresholds and Intervals) is only updated if it's a UI push
        // OR if this is the first time we see this station (existingData is empty)
        const isFirstSeen = Object.keys(existingData).length === 0;

        const sensorData = {
            distance,
            warning: (isUiUpdate || isFirstSeen) ? (warning || existingData.warning || 30.0) : (existingData.warning || 30.0),
            alarm: (isUiUpdate || isFirstSeen) ? (alarm || existingData.alarm || 15.0) : (existingData.alarm || 15.0),
            status,
            forecast,
            rainExpected,
            river: river || existingData.river,
            intervals: (isUiUpdate || isFirstSeen) ? (intervals || existingData.intervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 }) : (existingData.intervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 }),
            lastSeen: new Date().toISOString()
        };

        if (isUiUpdate) {
            console.log(`[Config] Update triggered by Master UI for station: ${station}`);
        } else if (!isFirstSeen) {
            console.log(`[Config] Enforcing cloud-leader values for station: ${station}`);
        }

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

        // Determine next measurement interval (in seconds)
        const userIntervals = intervals || (stations[station] && stations[station].intervals) || {
            sunny: 15,
            moderate: 10,
            stormy: 5,
            waterbomb: 2
        };

        let nextInterval = userIntervals.sunny * 60; // Default: Sunny

        if (status === 'ALARM') {
            nextInterval = userIntervals.waterbomb * 60;
        } else if (status === 'WARNING') {
            nextInterval = userIntervals.stormy * 60;
        } else if (forecast && forecast.toLowerCase().includes('waterbomb')) {
            nextInterval = userIntervals.waterbomb * 60;
        } else if (forecast && (forecast.toLowerCase().includes('stormy') || forecast.toLowerCase().includes('heavy'))) {
            nextInterval = userIntervals.stormy * 60;
        } else if (rainExpected || (forecast && (forecast.toLowerCase().includes('rain') || forecast.toLowerCase().includes('drizzle')))) {
            // General rain or moderate rain
            nextInterval = (forecast && forecast.toLowerCase().includes('moderate')) ? userIntervals.moderate * 60 : userIntervals.stormy * 60;

            // If it's real rainExpected (from OWM), use stormy
            if (rainExpected && !forecast.toLowerCase().includes('simulation')) {
                nextInterval = userIntervals.stormy * 60;
            }
        }


        await store.setJSON("latest_status", sensorData);
        await store.setJSON("stations_data", stations);

        return new Response(JSON.stringify({
            success: true,
            updated: station,
            data: sensorData,
            historyCount: history.length,
            nextInterval: nextInterval
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Update failed', details: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

};
