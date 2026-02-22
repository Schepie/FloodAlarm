#pragma once
#include <Arduino.h>

/// Manages the JSN-SR04T ultrasonic sensor.
namespace SensorMgr {
    /// Configure Trig/Echo pins.
    void begin();

    /// Read distance in cm (median of 5 readings for stability).
    /// Returns -1.0 if no valid echo received.
    float readDistanceCm();
}
