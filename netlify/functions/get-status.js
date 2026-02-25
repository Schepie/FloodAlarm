import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const STATIONS = ["Doornik", "Oudenaarde", "Gent", "Dendermonde", "Antwerpen"];

    try {
        const store = getStore("flood_data");
        const storedStations = await store.get("stations_data", { type: "json" }) || {};

        // Merge stored data with defaults (simulated)
        const allStations = STATIONS.reduce((acc, name) => {
            const stored = storedStations[name] || {};

            // Generate dynamic weather for this request
            const weather = {
                temp: 10 + Math.floor(Math.random() * 8),
                condition: "Variable",
                rainProb: Math.floor(Math.random() * 100),
                windSpeed: 5 + Math.floor(Math.random() * 15),
                daily: [
                    { day: "Wed", temp: 14, icon: "cloud-sun", rain: 10 },
                    { day: "Thu", temp: 11, icon: "cloud-rain", rain: 85 },
                    { day: "Fri", temp: 9, icon: "cloud", rain: 30 }
                ]
            };

            acc[name] = {
                distance: 100 + (Math.random() * 50),
                warning: 30.0,
                alarm: 15.0,
                status: "NORMAL",
                forecast: "Stable",
                rainExpected: false,
                lastSeen: new Date().toISOString(),
                isSimulated: name !== "Antwerpen",
                intervals: {
                    sunny: 15,
                    moderate: 10,
                    stormy: 5,
                    waterbomb: 2
                },
                ...stored,
                weather // Force weather to be included/updated
            };
            return acc;
        }, {});

        // Add global Belgium weather for when no station is selected
        allStations["Belgium"] = {
            distance: 0,
            status: "NORMAL",
            isSimulated: true,
            weather: {
                temp: 12,
                condition: "Cloudy",
                rainProb: 45,
                windSpeed: 10,
                daily: [
                    { day: "Wed", temp: 13, icon: "cloud-sun", rain: 20 },
                    { day: "Thu", temp: 10, icon: "cloud-rain", rain: 60 },
                    { day: "Fri", temp: 11, icon: "cloud", rain: 15 }
                ]
            }
        };

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
