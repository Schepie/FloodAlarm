import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const url = new URL(req.url);
    const station = url.searchParams.get("station") || "Antwerpen";

    try {
        const store = getStore("flood_data");
        const key = `pending_notify_${station}`;

        const data = await store.get(key, { type: "json" });

        if (data) {
            // Found a message! Delete it so it's not delivered again
            await store.delete(key);

            return new Response(JSON.stringify({
                pending: true,
                message: data.message,
                timestamp: data.timestamp
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ pending: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Check notify error:", error);
        return new Response(JSON.stringify({ error: "Failed to check notifications" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
