import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Security check: Match a secret key in environment variables or query param
    const authHeader = event.headers['authorization'] || event.queryStringParameters?.key;
    const SECRET_KEY = process.env.FLOOD_API_KEY || "change_me_later";

    if (authHeader !== SECRET_KEY) {
        return { statusCode: 401, body: 'Unauthorized' };
    }

    try {
        const body = JSON.parse(event.body);
        const { distance, warning, alarm, status, forecast, rainExpected } = body;

        const sensorData = {
            distance,
            warning,
            alarm,
            status,
            forecast,
            rainExpected,
            lastSeen: new Date().toISOString()
        };

        // Save to Netlify Blobs (the "Cloud Store")
        const store = getStore("flood_data");
        await store.setJSON("latest_status", sensorData);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, received: sensorData })
        };
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid data format', details: error.message })
        };
    }
};
