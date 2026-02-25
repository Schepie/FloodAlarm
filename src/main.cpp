#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncWebServer.h>
#include <time.h>

#include "Config.h"
#include "WiFiProvisioning.h"
#include "SensorManager.h"
#include "StorageManager.h"
#include "WeatherService.h"
#include "WebHandler.h"
#include "NotificationManager.h"
#include "CloudSync.h"

// ─── Globals ────────────────────────────────────────────────────────────────
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

float currentDistance = -1.0f;
float warningThreshold = DEFAULT_WARNING_CM;
float alarmThreshold   = DEFAULT_ALARM_CM;
bool  buzzerActive     = false;

// ─── Simulation ─────────────────────────────────────────────────────────────
bool  simulationActive = false;
float simulatedDistance = 0.0f;

void setSimulation(bool active, float distance) {
    simulationActive = active;
    simulatedDistance = distance;
    Serial.printf("[Sim] Mode: %s, Distance: %.1f\n", active ? "ON" : "OFF", distance);
}

unsigned long lastSensorRead      = 0;
unsigned long lastLogTime         = 0;
unsigned long lastWeatherPoll     = 0;
unsigned long lastWSBroadcast     = 0;
unsigned long lastNotificationTime = 0;
unsigned long lastCloudPush       = 0;

// ─── NTP Time ───────────────────────────────────────────────────────────────
unsigned long getEpoch() {
    return (unsigned long)time(nullptr);
}

void initNTP() {
    configTime(3600, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("[NTP] Syncing");
    int tries = 0;
    while (getEpoch() < 100000 && tries < 20) {
        delay(500);
        Serial.print(".");
        tries++;
    }
    Serial.printf("\n[NTP] Epoch: %lu\n", getEpoch());
}

// ─── Setup ──────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    // CRITICAL: ESP32-C3 can take time to start the USB port
    for(int i=5; i>0; i--) {
        delay(1000);
        Serial.printf("[DEBUG] Starting in %d...\n", i);
    }
    
    Serial.println("\n[BOOT] VERIFIED: Serial communication is working!");
    
    // Buzzer pin
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);

    // Init sensor + storage
    SensorMgr::begin();
    StorageMgr::begin();

    // WiFi: honor WIFI_FORCE_CONFIG Choice
    bool connected = false;

    if (WIFI_FORCE_CONFIG && strlen(WIFI_SSID) > 0) {
        Serial.printf("[Main] WIFI_FORCE_CONFIG is ON. Using hardcoded WiFi: %s\n", WIFI_SSID);
        WiFi.mode(WIFI_STA);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
            delay(500); Serial.print(".");
        }
        Serial.println();
        connected = (WiFi.status() == WL_CONNECTED);
    }


    if (!connected && !WiFiProv::connectFromStored()) {
        if (WIFI_FORCE_CONFIG) {
            Serial.println("[Main] WiFi connection failed. AP Mode is DISABLED via Config.h");
            Serial.println("[Main] Retrying in 30 seconds...");
            delay(30000);
            ESP.restart();
        } else {
            Serial.println("[Main] No WiFi — starting provisioning portal.");
            Serial.println("[Main] Connect your phone to '" AP_SSID "' and open 192.168.4.1");
            WiFiProv::startProvisioningPortal();  // blocks until creds submitted → reboots
        }
    }

    // At this point WiFi is connected
    Serial.println("[Main] WiFi connected. IP: " + WiFiProv::getLocalIP());

    // NTP
    initNTP();

    // Weather
    WeatherSvc::begin(OWM_API_KEY, OWM_CITY, OWM_COUNTRY);
    WeatherSvc::update();  // initial fetch

    // Web server
    WebHandler::begin(server, ws);
    server.begin();
    Serial.println("[Main] Web server started at http://" + WiFiProv::getLocalIP() + "/");

    Serial.println("\n[Main] System running. Sensor reading every 2s, logging every 10min.\n");
}

// ─── Loop ───────────────────────────────────────────────────────────────────
void loop() {
    unsigned long now = millis();

    // ── Read sensor ─────────────────────────────────────────────────────
    if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
        lastSensorRead = now;
        
        if (simulationActive) {
            currentDistance = simulatedDistance;
        } else {
            float dist = SensorMgr::readDistanceCm();
            if (dist > 0) {
                currentDistance = dist;
            }
        }
    }

    // ── Update thresholds based on weather ──────────────────────────────
    if (WeatherSvc::isRainExpected()) {
        warningThreshold = DEFAULT_WARNING_CM * RAIN_THRESHOLD_FACTOR;
        alarmThreshold   = DEFAULT_ALARM_CM   * RAIN_THRESHOLD_FACTOR;
    } else {
        warningThreshold = DEFAULT_WARNING_CM;
        alarmThreshold   = DEFAULT_ALARM_CM;
    }

    // ── Check alarm / warning ───────────────────────────────────────────
    if (currentDistance > 0) {
        if (currentDistance <= alarmThreshold) {
            // ALARM — continuous buzzer
            if (!buzzerActive) {
                Serial.println("[ALARM] Water level CRITICAL! Distance: " + String(currentDistance) + " cm");
                buzzerActive = true;
                
                // Send Telegram Notification
                if (now - lastNotificationTime >= (TELEGRAM_COOLDOWN_MIN * 60000UL) || lastNotificationTime == 0) {
                    lastNotificationTime = now;
                    String msg = "🚨 FLOOD ALARM! Water distance: " + String(currentDistance) + " cm";
                    if (WeatherSvc::isRainExpected()) msg += " (Rain expected)";
                    NotificationMgr::sendTelegram(msg);
                }
            }
            digitalWrite(PIN_BUZZER, HIGH);
        } else if (currentDistance <= warningThreshold) {
            // WARNING — intermittent beep
            static unsigned long lastBeep = 0;
            if (now - lastBeep >= 1000) {
                lastBeep = now;
                digitalWrite(PIN_BUZZER, !digitalRead(PIN_BUZZER));
            }
            if (buzzerActive) {
                // Was in alarm, now warning — log change
                Serial.println("[WARNING] Water level elevated. Distance: " + String(currentDistance) + " cm");
            }
            buzzerActive = false;
        } else {
            // NORMAL
            digitalWrite(PIN_BUZZER, LOW);
            buzzerActive = false;
        }
    }

    // ── Broadcast via WebSocket ─────────────────────────────────────────
    if (now - lastWSBroadcast >= WS_BROADCAST_INTERVAL_MS) {
        lastWSBroadcast = now;
        WebHandler::broadcastLevel(ws, currentDistance,
                                   warningThreshold, alarmThreshold,
                                   WeatherSvc::isRainExpected(),
                                   WeatherSvc::getForecastDescription());
        WebHandler::cleanupClients(ws);
    }

    // ── Log to CSV ──────────────────────────────────────────────────────
    if (now - lastLogTime >= LOG_INTERVAL_MS) {
        lastLogTime = now;
        if (currentDistance > 0) {
            unsigned long epoch = getEpoch();
            StorageMgr::logReading(epoch, currentDistance);
        }
    }

    // ── Poll weather ────────────────────────────────────────────────────
    if (now - lastWeatherPoll >= WEATHER_POLL_INTERVAL_MS) {
        lastWeatherPoll = now;
        WeatherSvc::update();
    }

    // ── Cloud Push ──────────────────────────────────────────────────────
    if (now - lastCloudPush >= CLOUD_PUSH_INTERVAL_MS) {
        lastCloudPush = now;
        
        String statusStr = "NORMAL";
        if (currentDistance <= alarmThreshold) statusStr = "ALARM";
        else if (currentDistance <= warningThreshold) statusStr = "WARNING";

        CloudSync::pushData(
            currentDistance, 
            warningThreshold, 
            alarmThreshold,
            statusStr, 
            WeatherSvc::isRainExpected(), 
            WeatherSvc::getForecastDescription()
        );
    }

    // ── Heartbeat ──────────────────────────────────────────────────────
    static unsigned long lastHeartbeat = 0;
    if (now - lastHeartbeat >= 5000) {
        lastHeartbeat = now;
        Serial.print("[Heartbeat] System uptime: ");
        Serial.print(now / 1000);
        Serial.println("s");
    }

    delay(10); // yield
}
