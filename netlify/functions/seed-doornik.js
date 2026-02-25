import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    try {
        const station = "Doornik";
        const pointsCount = 96; // One point every 15 mins for 24h
        const now = Date.now();
        const history = [];

        for (let i = pointsCount; i >= 0; i--) {
            const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
            // Random value between 50 and 120
            const val = Math.floor(Math.random() * (120 - 50 + 1) + 50);
            history.push({ ts, val });
        }

        // --- Store History ---
        const historyStore = getStore("flood_history");
        const historyKey = `history_${station}`;
        await historyStore.setJSON(historyKey, history);

        // --- Store Latest Status ---
        const dataStore = getStore("flood_data");
        let stations = await dataStore.get("stations_data", { type: "json" }) || {};

        const latestPoint = history[history.length - 1];
        stations[station] = {
            distance: latestPoint.val,
            warning: 30.0,
            alarm: 15.0,
            status: latestPoint.val <= 15.0 ? 'ALARM' : (latestPoint.val <= 30.0 ? 'WARNING' : 'NORMAL'),
            forecast: "Simulated Data (Seeded)",
            rainExpected: false,
            lastSeen: latestPoint.ts,
            isSimulated: true
        };

        await dataStore.setJSON("stations_data", stations);

        return new Response(JSON.stringify({
            success: true,
            message: `Seeded ${history.length} points for ${station}`,
            range: "50cm - 120cm",
            latest: stations[station]
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Seeding failed', details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
