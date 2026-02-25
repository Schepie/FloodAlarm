#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "CloudSync.h"
#include "Config.h"
#include <Preferences.h>

namespace CloudSync {
    static Preferences prefs;

    int32_t pushData(float distance, float warnThr, float alarmThr, 
                     const String& status, bool rainExpected, const String& forecast) {
        
        if (WiFi.status() != WL_CONNECTED) return -1;

        // Load metadata
        prefs.begin("wifi", true); // read-only
        String station = prefs.getString("station", "Antwerpen");
        String river = prefs.getString("river", "Schelde");
        prefs.end();

        WiFiClientSecure client;
        client.setInsecure();
        
        HTTPClient http;
        
        Serial.println("[Cloud] Pushing to Netlify...");

        // Send API key as query parameter for authentication
        String fullUrl = String(CLOUD_NETLIFY_URL) + "?key=" + String(CLOUD_API_KEY);

        if (http.begin(client, fullUrl)) {
            http.addHeader("Content-Type", "application/json");
            http.addHeader("Authorization", CLOUD_API_KEY);
            
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

            String payload;
            serializeJson(doc, payload);

            int httpCode = http.POST(payload);
            int32_t nextInterval = -1;

            if (httpCode > 0) {
                Serial.printf("[Cloud] POST result: %d\n", httpCode);
                String response = http.getString();
                
                if (httpCode == 200) {
                    JsonDocument respDoc;
                    deserializeJson(respDoc, response);
                    if (respDoc.containsKey("nextInterval")) {
                        nextInterval = respDoc["nextInterval"];
                        Serial.printf("[Cloud] Next interval from server: %d s\n", nextInterval);
                    }
                } else {
                    Serial.println("[Cloud] Response: " + response);
                }
                http.end();
                return nextInterval;
            } else {
                Serial.printf("[Cloud] POST failed: %s\n", http.errorToString(httpCode).c_str());
            }
            http.end();
        }
        return -1;
    }


    bool migrateStation(const String& oldName, const String& newName, const String& river) {

        if (WiFi.status() != WL_CONNECTED) return false;

        WiFiClientSecure client;
        client.setInsecure();
        HTTPClient http;

        // Construct migration URL (based on the push URL but different endpoint)
        String url = CLOUD_NETLIFY_URL;
        url.replace("push-status", "migrate-station");
        url += "?key=";
        url += CLOUD_API_KEY;

        if (http.begin(client, url)) {
            http.addHeader("Content-Type", "application/json");
            
            JsonDocument doc;
            doc["oldStation"] = oldName;
            doc["newStation"] = newName;
            doc["river"] = river;

            String payload;
            serializeJson(doc, payload);

            int httpCode = http.POST(payload);
            http.end();
            return (httpCode == 200 || httpCode == 204);
        }
        return false;
    }
}

