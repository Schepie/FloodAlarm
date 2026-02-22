import fetch from 'node-fetch';

export const handler = async (event, context) => {
    const targetUrl = process.env.ESP8266_URL || event.queryStringParameters?.url;

    if (!targetUrl) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Missing ESP8266 URL' })
        };
    }

    try {
        const response = await fetch(`${targetUrl}/api/status`);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 502,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Failed to connect to ESP8266', details: error.message })
        };
    }
};
