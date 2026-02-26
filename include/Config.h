#pragma once

// ─── Pin Definitions ────────────────────────────────────────────────────────
#define PIN_TRIG        5   // D1
#define PIN_ECHO        4   // D2
#define PIN_BUZZER      14  // D5

// ─── Water-Level Thresholds (distance in cm from sensor to water surface) ──
//  Lower distance = higher water → alarm condition
#define DEFAULT_WARNING_CM   30.0f   // Warning threshold
#define DEFAULT_ALARM_CM     15.0f   // Alarm threshold (critical)
#define RAIN_THRESHOLD_FACTOR 0.8f   // Multiply thresholds by this when rain expected

// ─── Timing (milliseconds) ─────────────────────────────────────────────────
#define SENSOR_READ_INTERVAL_MS    2000UL       // Read sensor every 2 s
#define LOG_INTERVAL_MS            60000UL      // Log to CSV every 1 min
#define WEATHER_POLL_INTERVAL_MS   1800000UL    // Poll weather every 30 min
#define WS_BROADCAST_INTERVAL_MS   2000UL       // WebSocket push every 2 s
#define CLOUD_PUSH_INTERVAL_MS     15000UL      // Push to Netlify every 15 s

// ─── OpenWeatherMap ─────────────────────────────────────────────────────────
#define OWM_API_KEY   "7e4bc4f56020ed1937bfaada3797e964"
#define OWM_CITY      "HASSELT"
#define OWM_COUNTRY   "BE"

// ─── WiFi Settings ──────────────────────────────────────────────────────────
// Option A: Hardcoded credentials
#define WIFI_SSID     "Snel"   
#define WIFI_PASSWORD "gscanwireless"

// Set to true to disable the Provisioning Portal and only use the credentials above
#define WIFI_FORCE_CONFIG false


// Option B: Provisioning Mode (fallback)
#define AP_SSID       "FloodMonitor-Setup"
#define AP_PASSWORD   "12345678"

// ─── Telegram Notifications ────────────────────────────────────────────────
// See USER_GUIDE.md for instructions on how to get these.
#define NOTIFICATIONS_ENABLED  true
#define TELEGRAM_BOT_TOKEN    "8378172918:AAEIjWzWkwUKgtTyIGav4QNJD-XDgDugNXY"
#define TELEGRAM_CHAT_ID      "8336474821"
#define TELEGRAM_COOLDOWN_MIN  1  // Wait 30 min before sending another alert

// ─── CSV / LittleFS ────────────────────────────────────────────────────────
#define HISTORY_PATH     "/history.csv"
#define MAX_CSV_ENTRIES  144   // 24 hours at 10-min intervals

// ─── Netlify Cloud Push ────────────────────────────────────────────────────
#define CLOUD_NETLIFY_URL "https://floodalarm.netlify.app/.netlify/functions/push-status"
#define CLOUD_API_KEY     "nfp_hHjozGS5UyWGkNTjkyoQVNThqVoudhjRac1d"
