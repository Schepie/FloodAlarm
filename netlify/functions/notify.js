import fetch from 'node-fetch';
import { FormData } from 'formdata-node';

export const handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const targetUrl = process.env.ESP8266_URL || event.queryStringParameters?.url;

    let message;
    try {
        const body = JSON.parse(event.body);
        message = body.message;
    } catch (e) {
        return { statusCode: 400, body: 'Invalid JSON body' };
    }

    if (!targetUrl || !message) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Missing parameters' })
        };
    }

    try {
        const form = new FormData();
        form.append('message', message);

        const response = await fetch(`${targetUrl}/api/notify`, {
            method: 'POST',
            body: form
        });

        if (response.ok) {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true })
            };
        } else {
            throw new Error(`ESP8266 responded with ${response.status}`);
        }
    } catch (error) {
        return {
            statusCode: 502,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Failed to notify ESP8266', details: error.message })
        };
    }
};
