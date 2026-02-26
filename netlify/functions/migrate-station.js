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
        const { oldStation, newStation, river } = await req.json();

        if (!oldStation || !newStation) {
            return new Response('Missing station names', { status: 400 });
        }

        const dataStore = getStore("flood_data");
        const historyStore = getStore("flood_history");

        // 1. Move Station Data
        let stations = await dataStore.get("stations_data", { type: "json" }) || {};

        if (stations[oldStation]) {
            const currentData = stations[oldStation];
            delete stations[oldStation];
            stations[newStation] = {
                ...currentData,
                river: river || currentData.river
            };
            await dataStore.setJSON("stations_data", stations);
        }

        // 2. Move History
        const oldHistoryKey = `history_${oldStation}`;
        const newHistoryKey = `history_${newStation}`;

        const history = await historyStore.get(oldHistoryKey, { type: "json" });
        if (history) {
            await historyStore.setJSON(newHistoryKey, history);
            await historyStore.delete(oldHistoryKey);
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Migrated ${oldStation} to ${newStation}`,
            riverUpdated: !!river
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Migration failed', details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
