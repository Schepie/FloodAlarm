import { getStore } from "@netlify/blobs";

// Station → coordinates for server-side weather lookup
const STATION_COORDS = {
    antwerpen: { lat: 51.2194, lon: 4.4025, name: "Antwerpen" },
    gent: { lat: 51.0543, lon: 3.7174, name: "Gent" },
    oudenaarde: { lat: 50.8486, lon: 3.6025, name: "Oudenaarde" },
    doornik: { lat: 50.6079, lon: 3.3897, name: "Doornik" },
    dendermonde: { lat: 51.0272, lon: 4.1016, name: "Dendermonde" },
};

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache to avoid OWM quota burn

/**
 * Fetch weather from OpenWeatherMap for a given station.
 * Uses Netlify Blobs as a 30-min cache to avoid burning OWM quota.
 */
async function fetchStationWeather(stationKey, weatherStore) {
    const cacheKey = `weather_${stationKey}`;
    let cached = null;
    try { cached = await weatherStore.get(cacheKey, { type: "json" }); } catch (_) { }

    if (cached && cached.fetchedAt && (Date.now() - cached.fetchedAt) < WEATHER_CACHE_TTL_MS) {
        console.log(`[Weather] Serving cached weather for ${stationKey}`);
        return cached;
    }

    const coords = STATION_COORDS[stationKey];
    if (!coords) {
        console.log(`[Weather] No coords for ${stationKey}, using defaults`);
        return cached || { forecast: "Unknown", rainExpected: false, tier: "sunny", temp: null, rainProb: null };
    }

    const OWM_KEY = process.env.OWM_API_KEY;
    if (!OWM_KEY) {
        console.warn("[Weather] OWM_API_KEY not set in Netlify env vars");
        return cached || { forecast: "No API key", rainExpected: false, tier: "sunny", temp: null, rainProb: null };
    }

    // Hard 3s timeout so we never block the ESP's HTTP client (which times out ~5s)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&cnt=2&appid=${OWM_KEY}&units=metric`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) {
            console.warn(`[Weather] OWM HTTP ${res.status}`);
            return cached || { forecast: `OWM ${res.status}`, rainExpected: false, tier: "sunny", temp: null, rainProb: null };
        }
        const data = await res.json();
        const entry = data.list?.[0];
        if (!entry) return cached || { forecast: "No data", rainExpected: false, tier: "sunny", temp: null, rainProb: null };

        const mainWeather = entry.weather?.[0]?.main || "Unknown";
        const description = entry.weather?.[0]?.description || mainWeather;
        const rainExpected = ["Rain", "Thunderstorm", "Drizzle", "Squall"].includes(mainWeather);
        const temp = Math.round(entry.main?.temp ?? null);
        const rainProb = Math.round((entry.pop ?? 0) * 100);
        const windSpeed = Math.round(entry.wind?.speed ?? 0);

        let tier = "sunny";
        if (mainWeather === "Thunderstorm") tier = "waterbomb";
        else if (mainWeather === "Rain" && rainProb > 70) tier = "stormy";
        else if (rainExpected) tier = "moderate";

        const weatherResult = { forecast: description, rainExpected, tier, temp, rainProb, windSpeed, fetchedAt: Date.now() };
        try { await weatherStore.setJSON(cacheKey, weatherResult); } catch (_) { }
        console.log(`[Weather] Fetched for ${stationKey}: ${description} (tier: ${tier})`);
        return weatherResult;
    } catch (err) {
        clearTimeout(timer);
        const reason = err.name === "AbortError" ? "timeout (3s)" : err.message;
        console.warn(`[Weather] OWM skipped for ${stationKey}: ${reason} — using ${cached ? "stale cache" : "defaults"}`);
        return cached || { forecast: "Unavailable", rainExpected: false, tier: "sunny", temp: null, rainProb: null };
    }
}


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

    if (authHeader.startsWith('Bearer ')) {
        authHeader = authHeader.substring(7);
    }

    const SECRET_KEY = process.env.FLOOD_API_KEY;

    if (!SECRET_KEY) {
        console.error("[Auth] CRITICAL: FLOOD_API_KEY is not set in Netlify Environment Variables!");
        return new Response('Server Configuration Error: FLOOD_API_KEY missing in Netlify settings', { status: 500, headers: corsHeaders });
    }

    const normalizedAuth = authHeader.trim();

    if (normalizedAuth !== SECRET_KEY.trim()) {
        const expectedHint = SECRET_KEY.trim().substring(0, 3);
        const receivedHint = normalizedAuth.substring(0, 3);
        console.warn(`[Auth] Unauthorized attempt. Expected: ${expectedHint}... Received: ${receivedHint}...`);
        return new Response(`Unauthorized: API Key mismatch.`, { status: 401, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log("[Cloud] Inbound Request:", JSON.stringify(body));

        // ESP only sends: distance, status, station, river
        // UI additionally sends: warning, alarm, intervals, isUiUpdate, simWeatherTier
        let { distance, warning, alarm, status, station = "Antwerpen", river = "Schelde", intervals, isUiUpdate, simWeatherTier } = body;
        const stationKey = station.toLowerCase().trim();

        console.log(`[Cloud] Normalized Key: "${stationKey}" (isUiUpdate: ${!!isUiUpdate})`);

        const store = getStore("flood_data");
        const weatherStore = getStore("flood_weather");

        let stations = await store.get("stations_data", { type: "json" }) || {};

        // Clean up legacy uppercase keys from the store to prevent duplicate state
        if (stations[station] && station !== stationKey) {
            delete stations[station];
        }

        const existingData = stations[stationKey] || {};

        // Configuration is only updated by UI push, otherwise enforce cloud-leader values
        const hasExistingConfig = existingData.warning !== undefined && existingData.alarm !== undefined;

        // Fetch weather server-side (cached 30 min)
        // If simulator is active (simWeatherTier sent by UI), override with sim tier
        let weather;
        if (isUiUpdate && simWeatherTier) {
            // Simulator weather override — don't hit OWM
            const tierMap = {
                sunny: { forecast: "Simulation: Clear", rainExpected: false, tier: "sunny" },
                moderate: { forecast: "Simulation: Moderate Rain", rainExpected: true, tier: "moderate" },
                stormy: { forecast: "Simulation: Stormy / Heavy", rainExpected: true, tier: "stormy" },
                waterbomb: { forecast: "Simulation: Waterbomb", rainExpected: true, tier: "waterbomb" }
            };
            weather = tierMap[simWeatherTier] || tierMap.sunny;
            console.log(`[Weather] Using simulator override: ${simWeatherTier}`);
        } else {
            // Real weather from OWM
            weather = await fetchStationWeather(stationKey, weatherStore);
            // If a forced tier is stored (from simulator), override the OWM-derived tier for interval calc
            // so the ESP gets the right interval even on its own push cycle
            if (existingData.forcedWeatherTier && existingData.forcedWeatherTier !== 'sunny') {
                weather.tier = existingData.forcedWeatherTier;
                console.log(`[Weather] Using stored forcedWeatherTier: ${existingData.forcedWeatherTier} (overrides OWM tier)`);
            }
        }

        const isValidReading = distance !== undefined && distance > 0;

        const sensorData = {
            // Only update distance if reading is valid — keep last known good value otherwise
            distance: isValidReading ? distance : (existingData.distance ?? distance),
            warning: isUiUpdate ? (warning || 30.0) : (hasExistingConfig ? existingData.warning : (warning || 30.0)),
            alarm: isUiUpdate ? (alarm || 15.0) : (hasExistingConfig ? existingData.alarm : (alarm || 15.0)),
            status,
            forecast: weather.forecast,
            rainExpected: weather.rainExpected,
            weatherTier: weather.tier || "sunny",
            weather: {
                temp: weather.temp ?? existingData.weather?.temp,
                rainProb: weather.rainProb ?? existingData.weather?.rainProb,
                windSpeed: weather.windSpeed ?? existingData.weather?.windSpeed,
                condition: weather.forecast
            },
            river: river || existingData.river || "Schelde",
            intervals: isUiUpdate
                ? (intervals || existingData.intervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 })
                : (hasExistingConfig ? existingData.intervals : (intervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 })),
            // Persist the simulator's forced tier so real ESP pushes also get the right interval.
            // Cleared (null) when simulator is set to sunny (deactivated).
            forcedWeatherTier: isUiUpdate && simWeatherTier
                ? (simWeatherTier === 'sunny' ? null : simWeatherTier)
                : existingData.forcedWeatherTier || null,
            lastSeen: new Date().toISOString()
        };

        if (isUiUpdate) {
            console.log(`[Config] UI updated ${station} | W:${sensorData.warning} A:${sensorData.alarm}`);
        } else if (hasExistingConfig) {
            console.log(`[Config] Enforced leader values for ${station} | W:${sensorData.warning} A:${sensorData.alarm}`);
        } else {
            console.log(`[Config] Initializing new station ${station} | W:${sensorData.warning} A:${sensorData.alarm}`);
        }

        stations[stationKey] = sensorData;

        // --- History Logic ---
        const historyStore = getStore("flood_history");
        const historyKey = `history_${stationKey}`;
        let history = await historyStore.get(historyKey, { type: "json" }) || [];

        // Retroactively clean up any existing invalid readings (e.g. -1.0 from sensor errors)
        history = history.filter(e => e.val !== undefined && e.val > 0);

        // Only store valid readings in history (filter out sensor errors: -1, 0, undefined)
        if (isValidReading) {
            history.push({ ts: sensorData.lastSeen, val: distance });
        } else {
            console.warn(`[History] Skipping invalid distance reading: ${distance}`);
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        history = history.filter(entry => entry.ts > twentyFourHoursAgo);
        if (history.length > 500) history = history.slice(-500);

        await historyStore.setJSON(historyKey, history);

        // --- Determine next interval ---
        // Priority: 1) Simulator override (forcedWeatherTier) → 2) ALARM → 3) WARNING → 4) OWM weather tier
        const userIntervals = sensorData.intervals || { sunny: 15, moderate: 10, stormy: 5, waterbomb: 2 };
        const forcedTier = sensorData.forcedWeatherTier;
        const weatherTier = sensorData.weatherTier;
        let nextInterval;

        if (forcedTier && forcedTier !== 'sunny') {
            // Simulator is active — its tier wins over everything, even real WARNING/ALARM status
            nextInterval = userIntervals[forcedTier] * 60;
            console.log(`[Interval] Forced by simulator: ${forcedTier} → ${nextInterval}s`);
        } else if (status === 'ALARM') {
            nextInterval = userIntervals.waterbomb * 60;
        } else if (status === 'WARNING') {
            nextInterval = userIntervals.stormy * 60;
        } else if (weatherTier === 'waterbomb') {
            nextInterval = userIntervals.waterbomb * 60;
        } else if (weatherTier === 'stormy') {
            nextInterval = userIntervals.stormy * 60;
        } else if (weatherTier === 'moderate') {
            nextInterval = userIntervals.moderate * 60;
        } else {
            nextInterval = userIntervals.sunny * 60;
        }

        await store.setJSON("latest_status", sensorData);
        await store.setJSON("stations_data", stations);

        return new Response(JSON.stringify({
            success: true,
            updated: station,
            data: sensorData,
            historyCount: history.length,
            nextInterval
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
