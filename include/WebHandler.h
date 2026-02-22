#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>

/// Sets up HTTP routes and WebSocket handler on the given server.
namespace WebHandler {
    /// Register all routes and the WebSocket endpoint.
    void begin(AsyncWebServer& server, AsyncWebSocket& ws);

    /// Broadcast current sensor data + thresholds to all WS clients.
    void broadcastLevel(AsyncWebSocket& ws, float distanceCm,
                        float warningThr, float alarmThr,
                        bool rainExpected, const String& forecast);

    /// Clean up disconnected WS clients (call periodically).
    void cleanupClients(AsyncWebSocket& ws);
}
