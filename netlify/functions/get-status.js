import { getStore } from "@netlify/blobs";

export const handler = async () => {
    try {
        const store = getStore("flood_data");
        const data = await store.getJSON("latest_status");

        if (!data) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "No data stored yet" })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Cloud retrieval failed", details: error.message })
        };
    }
};
