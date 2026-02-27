import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    try {
        const store = getStore("flood_data");
        const storedStations = await store.get("stations_data", { type: "json" }) || {};

        // Merge stored data, ignoring invalid keys
        const allStations = {};
        for (const [key, value] of Object.entries(storedStations)) {
            if (key !== "null" && key !== "undefined" && key !== "" && key !== "belgium") {
                allStations[key] = value;
            }
        }

        // Ensure defaults if missing (for legacy data)
        for (const name in allStations) {
            if (!allStations[name].river) allStations[name].river = "Schelde";
        }

        return new Response(JSON.stringify(allStations), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            }
        });
    } catch (error) {
        console.error("Blob retrieval error:", error);
        return new Response(JSON.stringify({
            error: "Cloud retrieval failed",
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
