#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncWebServer.h>
#include <time.h>

#include "Config.h"
#include <Preferences.h>

#include "CloudSync.h"
#include "NotificationManager.h"
#include "SensorManager.h"
#include "StorageManager.h"
#include "WeatherService.h"
#include "WebHandler.h"
#include "WiFiProvisioning.h"

static Preferences settings;

// ─── Globals ────────────────────────────────────────────────────────────────
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

float currentDistance = -1.0f;
float warningThreshold = DEFAULT_WARNING_CM;
float alarmThreshold = DEFAULT_ALARM_CM;
bool buzzerActive = false;

// ─── Manual Sync Control ────────────────────────────────────────────────────
bool volatile pendingManualSync = false;

void triggerManualSync() { pendingManualSync = true; }

// ─── Deferred Migration Control ─────────────────────────────────────────────
bool volatile pendingMigration = false;
String migOldStation = "";
String migNewStation = "";
String migRiver = "";

// ─── Timing & Intervals ──────────────────────────────────────────────────────
unsigned long lastSensorRead = 0;
unsigned long lastLogTime = 0;
unsigned long lastWeatherPoll = 0;
unsigned long lastWSBroadcast = 0;
unsigned long lastNotificationTime = 0;
uint32_t currentIntervalMs = SENSOR_READ_INTERVAL_MS;

void setMeasurementInterval(uint32_t seconds) {
  if (seconds >= 30) { // Safety floor: 30s
    currentIntervalMs = seconds * 1000UL;
    Serial.printf("[Interval] Set to %d s\n", seconds);
  }
}

// ─── Simulation ─────────────────────────────────────────────────────────────
bool simulationActive = false;
float simulatedDistance = 100.0f;
unsigned long lastAutoSimUpdate = 0;
bool autoSimEnabled = false;

void setAutoSimulation(bool enabled) { autoSimEnabled = enabled; }

void setSimulation(bool active, float distance) {
  simulationActive = active;
  simulatedDistance = distance;
  Serial.printf("[Sim] Mode: %s, Distance: %.1f\n", active ? "ON" : "OFF",
                distance);
  triggerManualSync(); // Force immediate sync when toggling/changing simulation
}

// ─── Manual Sync Control ────────────────────────────────────────────────────

// ─── NTP Time ───────────────────────────────────────────────────────────────

unsigned long getEpoch() { return (unsigned long)time(nullptr); }

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
  for (int i = 5; i > 0; i--) {
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
    Serial.printf("[Main] WIFI_FORCE_CONFIG is ON. Using hardcoded WiFi: %s\n",
                  WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    connected = (WiFi.status() == WL_CONNECTED);
  }

  if (!connected && !WiFiProv::connectFromStored()) {
    if (WIFI_FORCE_CONFIG) {
      Serial.println(
          "[Main] WiFi connection failed. AP Mode is DISABLED via Config.h");
      Serial.println("[Main] Retrying in 30 seconds...");
      delay(30000);
      ESP.restart();
    } else {
      Serial.println("[Main] No WiFi — starting provisioning portal.");
      Serial.println("[Main] Connect your phone to '" AP_SSID
                     "' and open 192.168.4.1");
      WiFiProv::startProvisioningPortal(); // blocks until creds submitted →
                                           // reboots
    }
  }

  // At this point WiFi is connected
  Serial.println("[Main] WiFi connected. IP: " + WiFiProv::getLocalIP());

  // NTP
  initNTP();

  // Weather
  WeatherSvc::begin(OWM_API_KEY, OWM_CITY, OWM_COUNTRY);
  WeatherSvc::update(); // initial fetch

  // Load thresholds from preferences
  settings.begin("flood", false);
  warningThreshold = settings.getFloat("warn", DEFAULT_WARNING_CM);
  alarmThreshold = settings.getFloat("alarm", DEFAULT_ALARM_CM);
  settings.end();
  Serial.printf("[Main] Loaded Thresholds: Warn=%.1f, Alarm=%.1f\n",
                warningThreshold, alarmThreshold);

  // Web server
  WebHandler::begin(server, ws);
  server.begin();
  Serial.println("[Main] Web server started at http://" +
                 WiFiProv::getLocalIP() + "/");

  Serial.println("\n[Main] System running. Sensor reading every 2s, logging "
                 "every 10min.\n");
}

// ─── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Auto-Simulation ────────────────────────────────────────────────
  if (autoSimEnabled && (now - lastAutoSimUpdate >= 60000UL)) {
    lastAutoSimUpdate = now;
    simulationActive = true;
    simulatedDistance = 20.0f + (random(0, 1800) / 10.0f); // 20.0cm to 200.0cm
    Serial.printf("[AutoSim] Next distance: %.1f cm\n", simulatedDistance);
    triggerManualSync(); // Ensure the 1-minute auto-cycle value is pushed
                         // immediately
  }

  // ── Read sensor ─────────────────────────────────────────────────────

  // ── Read sensor ─────────────────────────────────────────────────────
  if (now - lastSensorRead >= currentIntervalMs) {
    lastSensorRead = now;

    if (simulationActive) {
      if (simulatedDistance > 0)
        currentDistance = simulatedDistance;
    } else {
      float dist = SensorMgr::readDistanceCm();
      if (dist > 0) {
        currentDistance = dist;
      }
    }

    // Update thresholds and buzzer
    float baseWarn = warningThreshold;
    float baseAlarm = alarmThreshold;

    float activeWarn = baseWarn;
    float activeAlarm = baseAlarm;

    if (WeatherSvc::isRainExpected()) {
      activeWarn *= RAIN_THRESHOLD_FACTOR;
      activeAlarm *= RAIN_THRESHOLD_FACTOR;
    }

    String statusStr = "NORMAL";
    if (currentDistance > 0) {
      if (currentDistance <= activeAlarm) {
        statusStr = "ALARM";
        digitalWrite(PIN_BUZZER, HIGH);
        buzzerActive = true;
        if (now - lastNotificationTime >= (TELEGRAM_COOLDOWN_MIN * 60000UL) ||
            lastNotificationTime == 0) {
          lastNotificationTime = now;
          NotificationMgr::sendTelegram(
              "🚨 FLOOD ALARM! Water: " + String(currentDistance) + " cm");
        }
      } else if (currentDistance <= activeWarn) {
        statusStr = "WARNING";
        digitalWrite(PIN_BUZZER, (now / 500) % 2); // Blink buzzer
        buzzerActive = false;
      } else {
        digitalWrite(PIN_BUZZER, LOW);
        buzzerActive = false;
      }
    }

    // ── Cloud Push (Every sensor read) ──────────────────────────────
    CloudSync::CloudConfig config =
        CloudSync::pushData(currentDistance, baseWarn, baseAlarm, statusStr);

    if (config.success) {
      if (config.nextIntervalS >= 30) {
        setMeasurementInterval(config.nextIntervalS);
      }
      if (config.warningThreshold > 0) {
        if (warningThreshold != config.warningThreshold) {
          warningThreshold = config.warningThreshold;
          Serial.printf("[Cloud] Synced Warn from leader: %s cm\n",
                        String(warningThreshold, 1).c_str());
          settings.begin("flood", false);
          settings.putFloat("warn", warningThreshold);
          settings.end();
        }
      }
      if (config.alarmThreshold > 0) {
        if (alarmThreshold != config.alarmThreshold) {
          alarmThreshold = config.alarmThreshold;
          Serial.printf("[Cloud] Synced Alarm from leader: %s cm\n",
                        String(alarmThreshold, 1).c_str());
          settings.begin("flood", false);
          settings.putFloat("alarm", alarmThreshold);
          settings.end();
        }
      }
      Serial.println("[Cloud] Sync successful");
    }
  }

  // ── Broadcast via WebSocket (Frequent updates) ──────────────────────
  if (now - lastWSBroadcast >= WS_BROADCAST_INTERVAL_MS) {
    lastWSBroadcast = now;
    String curStatus = "NORMAL";
    if (currentDistance <= alarmThreshold)
      curStatus = "ALARM";
    else if (currentDistance <= warningThreshold)
      curStatus = "WARNING";

    WebHandler::broadcastLevel(ws, currentDistance, warningThreshold,
                               alarmThreshold, WeatherSvc::isRainExpected(),
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

  // ── Manual Sync Check (Main Loop Only) ──────────────────────────────
  if (pendingManualSync) {
    pendingManualSync = false;
    Serial.println("[Main] Processing Manual Sync...");

    String statusStr = "NORMAL";
    float activeWarn = warningThreshold;
    float activeAlarm = alarmThreshold;
    if (WeatherSvc::isRainExpected()) {
      activeWarn *= RAIN_THRESHOLD_FACTOR;
      activeAlarm *= RAIN_THRESHOLD_FACTOR;
    }
    if (currentDistance > 0) {
      if (currentDistance <= activeAlarm)
        statusStr = "ALARM";
      else if (currentDistance <= activeWarn)
        statusStr = "WARNING";
    }

    CloudSync::CloudConfig config = CloudSync::pushData(
        currentDistance, warningThreshold, alarmThreshold, statusStr);

    if (config.success) {
      if (config.nextIntervalS >= 30)
        setMeasurementInterval(config.nextIntervalS);
      if (config.warningThreshold > 0 &&
          warningThreshold != config.warningThreshold) {
        warningThreshold = config.warningThreshold;
        Serial.printf("[Cloud] Manual Sync - Synced Warn from leader: %s cm\n",
                      String(warningThreshold, 1).c_str());
        settings.begin("flood", false);
        settings.putFloat("warn", warningThreshold);
        settings.end();
      }
      if (config.alarmThreshold > 0 &&
          alarmThreshold != config.alarmThreshold) {
        alarmThreshold = config.alarmThreshold;
        Serial.printf("[Cloud] Manual Sync - Synced Alarm from leader: %s cm\n",
                      String(alarmThreshold, 1).c_str());
        settings.begin("flood", false);
        settings.putFloat("alarm", alarmThreshold);
        settings.end();
      }
      Serial.println("[Cloud] Manual Sync Success");
    }
  }

  // ── Deferred Migration Check ────────────────────────────────────────
  if (pendingMigration) {
    pendingMigration = false;
    Serial.printf("[Main] Processing Migration: %s -> %s (%s)...\n",
                  migOldStation.c_str(), migNewStation.c_str(),
                  migRiver.c_str());

    bool success =
        CloudSync::migrateStation(migOldStation, migNewStation, migRiver);
    if (success) {
      Serial.println("[Main] Migration successful in cloud.");
    } else {
      Serial.println("[Main] Migration failed or not needed.");
    }
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
