import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    let message, station;
    try {
        const body = await req.json();
        message = body.message;
        station = body.station || "Antwerpen";
    } catch (e) {
        return new Response('Invalid JSON body', { status: 400 });
    }

    if (!message) {
        return new Response(JSON.stringify({ error: 'Missing message' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const store = getStore("flood_data");
        // Store as a pending notification for the specific station
        await store.setJSON(`pending_notify_${station}`, {
            message,
            timestamp: new Date().toISOString()
        });

        return new Response(JSON.stringify({
            success: true,
            message: "Notification queued in cloud"
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to store notification', details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
