#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "CloudSync.h"
#include "Config.h"
#include <Preferences.h>

namespace CloudSync {
    static Preferences prefs;

    bool pushData(float distance, float warnThr, float alarmThr, 
                  const String& status, bool rainExpected, const String& forecast) {
        
        if (WiFi.status() != WL_CONNECTED) return false;

        // Load metadata
        prefs.begin("wifi", true); // read-only
        String station = prefs.getString("station", "Antwerpen");
        String river = prefs.getString("river", "Schelde");
        prefs.end();

        WiFiClientSecure client;
        client.setInsecure(); // Netlify certs are dynamic, for IoT insecure is often easier but less secure.
        
        HTTPClient http;
        
        Serial.println("[Cloud] Pushing to Netlify...");

        if (http.begin(client, CLOUD_NETLIFY_URL)) {
            http.addHeader("Content-Type", "application/json");
            
            // Build JSON payload
            JsonDocument doc;
            doc["distance"] = distance;
            doc["warning"] = warnThr;
            doc["alarm"] = alarmThr;
            doc["status"] = status;
            doc["rainExpected"] = rainExpected;
            doc["forecast"] = forecast;
            doc["station"] = station;
            doc["river"] = river;
            doc["key"] = CLOUD_API_KEY; // Using query param/header style for auth


            String payload;
            serializeJson(doc, payload);

            int httpCode = http.POST(payload);

            if (httpCode > 0) {
                Serial.printf("[Cloud] POST result: %d\n", httpCode);
                String response = http.getString();
                Serial.println("[Cloud] Response: " + response);
                http.end();
                return (httpCode == 200);
            } else {
                Serial.printf("[Cloud] POST failed: %s\n", http.errorToString(httpCode).c_str());
            }
            http.end();
        }
        return false;
    }
}
