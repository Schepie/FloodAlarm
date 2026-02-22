#include "WeatherService.h"
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

static String _apiKey;
static String _city;
static String _country;
static bool   _rainExpected  = false;
static String _forecastDesc  = "Unknown";

void WeatherSvc::begin(const char* apiKey, const char* city, const char* country) {
    _apiKey  = apiKey;
    _city    = city;
    _country = country;
    Serial.println("[Weather] Initialized for " + _city + "," + _country);
}

bool WeatherSvc::update() {
    if (_apiKey.length() == 0 || _apiKey == "YOUR_OWM_API_KEY") {
        Serial.println("[Weather] No valid API key configured — skipping.");
        _forecastDesc = "No API key";
        return false;
    }

    String url = "http://api.openweathermap.org/data/2.5/forecast?q=" +
                 _city + "," + _country +
                 "&cnt=1&appid=" + _apiKey;

    WiFiClient client;
    HTTPClient http;
    http.begin(client, url);
    int code = http.GET();

    if (code != 200) {
        Serial.printf("[Weather] HTTP error: %d\n", code);
        http.end();
        _forecastDesc = "HTTP " + String(code);
        return false;
    }

    String payload = http.getString();
    http.end();

    // Parse JSON
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.printf("[Weather] JSON parse error: %s\n", err.c_str());
        _forecastDesc = "Parse error";
        return false;
    }

    // Extract the first forecast entry's weather.main
    const char* mainWeather = doc["list"][0]["weather"][0]["main"];
    const char* description = doc["list"][0]["weather"][0]["description"];

    if (mainWeather) {
        String mw = String(mainWeather);
        _forecastDesc = description ? String(description) : mw;
        _rainExpected = (mw == "Rain" || mw == "Thunderstorm" ||
                         mw == "Drizzle" || mw == "Squall");
        Serial.printf("[Weather] Forecast: %s  Rain expected: %s\n",
                      _forecastDesc.c_str(), _rainExpected ? "YES" : "NO");
    } else {
        _forecastDesc = "No data";
        _rainExpected = false;
    }

    return true;
}

bool WeatherSvc::isRainExpected() {
    return _rainExpected;
}

String WeatherSvc::getForecastDescription() {
    return _forecastDesc;
}
