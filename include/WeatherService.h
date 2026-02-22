#pragma once
#include <Arduino.h>

/// Fetches OpenWeatherMap 3-hour forecast and checks for rain/thunderstorm.
namespace WeatherSvc {
    /// Initialize with API key, city and country code.
    void begin(const char* apiKey, const char* city, const char* country);

    /// Fetch the latest forecast from OpenWeatherMap. Call periodically.
    /// Returns true on successful fetch.
    bool update();

    /// True if the latest forecast contains "Rain" or "Thunderstorm".
    bool isRainExpected();

    /// Human-readable forecast description (e.g. "Clear", "Rain").
    String getForecastDescription();
}
