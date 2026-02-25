import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const url = new URL(req.url);
    const station = url.searchParams.get('station');

    if (!station) {
        return new Response(JSON.stringify({ error: "Station parameter required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const historyStore = getStore("flood_history");
        const historyKey = `history_${station}`;
        const history = await historyStore.get(historyKey, { type: "json" }) || [];

        return new Response(JSON.stringify(history), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            }
        });
    } catch (error) {
        console.error("History retrieval error:", error);
        return new Response(JSON.stringify({
            error: "History retrieval failed",
            details: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
