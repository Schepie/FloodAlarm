#include "NotificationManager.h"
#include "Config.h"
#include <WiFiClientSecure.h>
#include <ESP8266HTTPClient.h>

bool NotificationMgr::sendTelegram(const String& message) {
    if (!NOTIFICATIONS_ENABLED) return false;

    String token = TELEGRAM_BOT_TOKEN;
    String chatID = TELEGRAM_CHAT_ID;

    if (token == "YOUR_BOT_TOKEN_HERE" || chatID == "YOUR_CHAT_ID_HERE") {
        Serial.println("[Notify] ERROR: Telegram credentials not set in Config.h");
        return false;
    }

    WiFiClientSecure client;
    client.setInsecure(); // No fingerprint management needed for simple alerts

    HTTPClient http;
    
    // URL format: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=<MSG>
    String url = "https://api.telegram.org/bot" + token + "/sendMessage";
    url += "?chat_id=" + chatID;
    url += "&text=" + message;

    Serial.println("[Notify] Sending Telegram alert...");
    
    if (http.begin(client, url)) {
        int httpCode = http.GET();
        if (httpCode > 0) {
            Serial.printf("[Notify] Telegram response: %d\n", httpCode);
            http.end();
            return (httpCode == 200);
        } else {
            Serial.printf("[Notify] Telegram GET failed: %s\n", http.errorToString(httpCode).c_str());
        }
        http.end();
    } else {
        Serial.println("[Notify] HTTP begin failed.");
    }

    return false;
}
