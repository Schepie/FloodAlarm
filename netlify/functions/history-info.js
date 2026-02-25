import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const url = new URL(req.url);
    const station = url.searchParams.get('station') || "Doornik";

    try {
        const historyStore = getStore("flood_history");
        const historyKey = `history_${station}`;
        const history = await historyStore.get(historyKey, { type: "json" }) || [];

        return new Response(JSON.stringify({
            station,
            count: history.length,
            oldest: history.length > 0 ? history[0].ts : null,
            latest: history.length > 0 ? history[history.length - 1].ts : null,
            raw_first: history.length > 0 ? history[0] : null,
            raw_last: history.length > 0 ? history[history.length - 1] : null
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
