#include "WebHandler.h"
#include "Config.h"
#include "NotificationManager.h"
#include "StorageManager.h"
#include "WeatherService.h"
#include <ArduinoJson.h>
#include <LittleFS.h>
<<<<<<< HEAD
=======
#include "NotificationManager.h"
#include <Preferences.h>
#include "Config.h"
#include "CloudSync.h"
>>>>>>> 67b61288e99a83ceb6c2492f030ee9e82ebd5de8

extern void setSimulation(bool active, float distance);
extern void setAutoSimulation(bool enabled);
extern void triggerManualSync();


extern float currentDistance;
extern float warningThreshold;
extern float alarmThreshold;
extern uint32_t currentIntervalMs;


void WebHandler::begin(AsyncWebServer &server, AsyncWebSocket &ws) {
  // ── WebSocket ───────────────────────────────────────────────────────
  server.addHandler(&ws);

  // ── Serve dashboard from LittleFS ───────────────────────────────────
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *req) {
    req->send(LittleFS, "/index.html", "text/html");
  });

  // ── API: History (CSV or JSON) ──────────────────────────────────────
  server.on("/api/history", HTTP_GET, [](AsyncWebServerRequest *req) {
    if (req->hasParam("format") && req->getParam("format")->value() == "json") {
      // Memory efficient JSON generation
      File f = LittleFS.open(HISTORY_PATH, "r");
      if (!f) {
        req->send(500, "text/plain", "File error");
        return;
      }

      AsyncResponseStream *response =
          req->beginResponseStream("application/json");
      response->print("{\"unit\":\"cm\",\"data\":[");

      // Skip header
      f.readStringUntil('\n');

<<<<<<< HEAD
      bool first = true;
      int count = 0;
      while (f.available()) {
        String line = f.readStringUntil('\n');
        line.trim();
        int comma = line.indexOf(',');
        if (comma != -1) {
          if (!first)
            response->print(",");
          response->print("{\"ts\":");
          response->print(line.substring(0, comma));
          response->print(",\"val\":");
          response->print(line.substring(comma + 1));
          response->print("}");
          first = false;
=======
            String json;
            serializeJson(doc, json);
            req->send(200, "application/json", json);
        } else {
            // Default to CSV for backward compatibility
            String csv = StorageMgr::getCSV();
            req->send(200, "text/csv", csv);
        }
    });

    // ── API: Current status JSON (Enhanced for Mobile App) ──────────────
    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest* req) {
        JsonDocument doc;
        doc["distance"]     = round(currentDistance * 10.0f) / 10.0f;
        doc["warning"]      = round(warningThreshold * 10.0f) / 10.0f;
        doc["alarm"]        = round(alarmThreshold * 10.0f) / 10.0f;
        doc["rainExpected"] = WeatherSvc::isRainExpected();
        doc["forecast"]     = WeatherSvc::getForecastDescription();
        doc["entries"]      = StorageMgr::getEntryCount();

        // Metadata
        Preferences prefs;
        prefs.begin("wifi", true);
        doc["station"]  = prefs.getString("station", "Antwerpen");
        doc["river"]    = prefs.getString("river", "Schelde");
        prefs.end();
        doc["interval"] = currentIntervalMs / 1000; // in seconds



        if (currentDistance <= 0) {
            doc["status"] = "UNKNOWN";
        } else if (currentDistance <= alarmThreshold) {
            doc["status"] = "ALARM";
        } else if (currentDistance <= warningThreshold) {
            doc["status"] = "WARNING";
        } else {
            doc["status"] = "NORMAL";
>>>>>>> 67b61288e99a83ceb6c2492f030ee9e82ebd5de8
        }

        // Periodic yield to prevent WDT reset
        if (++count % 10 == 0)
          yield();
      }
      f.close();

<<<<<<< HEAD
      response->print("]}");
      req->send(response);
=======
    // ── API: Simulation control ─────────────────────────────────────────
    server.on("/api/simulate", HTTP_POST, [](AsyncWebServerRequest* req) {
        bool active = false;
        float distance = 100.0f;

        if (req->hasParam("active", true)) {
            active = req->getParam("active", true)->value() == "true";
        }
        if (req->hasParam("distance", true)) {
            distance = req->getParam("distance", true)->value().toFloat();
        }

        setSimulation(active, distance);
        req->send(200, "text/plain", "OK");
    });

    // ── API: Manual Notification (Post Message) ─────────────────────────
    server.on("/api/notify", HTTP_POST, [](AsyncWebServerRequest* req) {
        if (req->hasParam("message", true)) {
            String msg = req->getParam("message", true)->value();
            bool success = NotificationMgr::sendTelegram("📱 Mobile App: " + msg);
            req->send(success ? 200 : 500, "text/plain", success ? "Sent" : "Failed");
        } else {
            req->send(400, "text/plain", "Missing message");
        }
    });

    // ── API: Settings (Update Station/River) ────────────────────────────
    server.on("/api/settings", HTTP_POST, [](AsyncWebServerRequest* req) {
        String newStation = "";
        String newRiver = "";

        if (req->hasParam("station", true)) newStation = req->getParam("station", true)->value();
        if (req->hasParam("river", true)) newRiver = req->getParam("river", true)->value();

        if (newStation.length() > 0) {
            Preferences prefs;
            prefs.begin("wifi", false);
            String oldStation = prefs.getString("station", "Antwerpen");
            
            // Trigger Cloud Migration if name changed
            if (newStation != oldStation) {
                CloudSync::migrateStation(oldStation, newStation, newRiver);
            }

            prefs.putString("station", newStation);
            if (newRiver.length() > 0) prefs.putString("river", newRiver);
            prefs.end();
            req->send(200, "text/plain", "OK");
        } else {
            req->send(400, "text/plain", "Missing station name");
        }
    });

    // ── API: Auto Simulation ────────────────────────────────────────────
    server.on("/api/autosim", HTTP_POST, [](AsyncWebServerRequest* req) {

        if (req->hasParam("enabled", true)) {
            bool enabled = req->getParam("enabled", true)->value() == "true";
            setAutoSimulation(enabled);
            req->send(200, "text/plain", "OK");
        } else {
            req->send(400, "text/plain", "Missing enabled param");
        }
    });

    // ── API: Manual Sync ───────────────────────────────────────────────
    server.on("/api/sync", HTTP_POST, [](AsyncWebServerRequest* req) {
        triggerManualSync();
        req->send(200, "text/plain", "OK");
    });

    Serial.println("[Web] Routes registered.");

}

void WebHandler::broadcastLevel(AsyncWebSocket& ws, float distanceCm,
                                 float warningThr, float alarmThr,
                                 bool rainExpected, const String& forecast) {
    if (ws.count() == 0) return;

    JsonDocument doc;
    doc["distance"]     = round(distanceCm * 10.0f) / 10.0f;
    doc["warning"]      = round(warningThr * 10.0f) / 10.0f;
    doc["alarm"]        = round(alarmThr * 10.0f) / 10.0f;
    doc["rainExpected"] = rainExpected;
    doc["forecast"]     = forecast;

    // Metadata
    Preferences prefs;
    prefs.begin("wifi", true);
    doc["station"] = prefs.getString("station", "Antwerpen");
    doc["river"]   = prefs.getString("river", "Schelde");
    prefs.end();
    doc["interval"] = currentIntervalMs / 1000;



    // Determine status
    if (distanceCm <= alarmThr) {
        doc["status"] = "ALARM";
    } else if (distanceCm <= warningThr) {
        doc["status"] = "WARNING";
>>>>>>> 67b61288e99a83ceb6c2492f030ee9e82ebd5de8
    } else {
      // Default: Stream the CSV file directly from LittleFS
      req->send(LittleFS, HISTORY_PATH, "text/csv");
    }
  });

  // ── API: Current status JSON (Enhanced for Mobile App) ──────────────
  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *req) {
    JsonDocument doc;
    doc["distance"] = round(currentDistance * 10.0f) / 10.0f;
    doc["warning"] = round(warningThreshold * 10.0f) / 10.0f;
    doc["alarm"] = round(alarmThreshold * 10.0f) / 10.0f;
    doc["rainExpected"] = WeatherSvc::isRainExpected();
    doc["forecast"] = WeatherSvc::getForecastDescription();
    doc["entries"] = StorageMgr::getEntryCount();

    if (currentDistance <= 0) {
      doc["status"] = "UNKNOWN";
    } else if (currentDistance <= alarmThreshold) {
      doc["status"] = "ALARM";
    } else if (currentDistance <= warningThreshold) {
      doc["status"] = "WARNING";
    } else {
      doc["status"] = "NORMAL";
    }

    String json;
    serializeJson(doc, json);

    AsyncWebServerResponse *response =
        req->beginResponse(200, "application/json", json);
    response->addHeader("Access-Control-Allow-Origin", "*");
    req->send(response);
  });

  // ── API: Simulation control ─────────────────────────────────────────
  server.on("/api/simulate", HTTP_POST, [](AsyncWebServerRequest *req) {
    bool active = false;
    float distance = 100.0f;

    if (req->hasParam("active", true)) {
      active = req->getParam("active", true)->value() == "true";
    }
    if (req->hasParam("distance", true)) {
      distance = req->getParam("distance", true)->value().toFloat();
    }

    setSimulation(active, distance);
    req->send(200, "text/plain", "OK");
  });

  // ── API: Manual Notification (Post Message) ─────────────────────────
  server.on("/api/notify", HTTP_POST, [](AsyncWebServerRequest *req) {
    if (req->hasParam("message", true)) {
      String msg = req->getParam("message", true)->value();
      bool success = NotificationMgr::sendTelegram("📱 Mobile App: " + msg);
      req->send(success ? 200 : 500, "text/plain", success ? "Sent" : "Failed");
    } else {
      req->send(400, "text/plain", "Missing message");
    }
  });

  Serial.println("[Web] Routes registered.");
}

void WebHandler::broadcastLevel(AsyncWebSocket &ws, float distanceCm,
                                float warningThr, float alarmThr,
                                bool rainExpected, const String &forecast) {
  if (ws.count() == 0)
    return;

  JsonDocument doc;
  doc["distance"] = round(distanceCm * 10.0f) / 10.0f;
  doc["warning"] = round(warningThr * 10.0f) / 10.0f;
  doc["alarm"] = round(alarmThr * 10.0f) / 10.0f;
  doc["rainExpected"] = rainExpected;
  doc["forecast"] = forecast;

  // Determine status
  if (distanceCm <= alarmThr) {
    doc["status"] = "ALARM";
  } else if (distanceCm <= warningThr) {
    doc["status"] = "WARNING";
  } else {
    doc["status"] = "NORMAL";
  }

  String msg;
  serializeJson(doc, msg);
  ws.textAll(msg);
}

void WebHandler::cleanupClients(AsyncWebSocket &ws) { ws.cleanupClients(); }
