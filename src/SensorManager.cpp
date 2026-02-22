#include "SensorManager.h"
#include "Config.h"

void SensorMgr::begin() {
    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    digitalWrite(PIN_TRIG, LOW);
    Serial.println("[Sensor] JSN-SR04T initialized (Trig=" + String(PIN_TRIG) +
                   " Echo=" + String(PIN_ECHO) + ")");
}

/// Take a single distance reading.
static float singleRead() {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30 ms timeout (~5 m max)
    if (duration == 0) return -1.0f;

    // Speed of sound ≈ 0.0343 cm/µs, round-trip → divide by 2
    float dist = (duration * 0.0343f) / 2.0f;
    return dist;
}

float SensorMgr::readDistanceCm() {
    const int NUM_SAMPLES = 5;
    float samples[NUM_SAMPLES];
    int validCount = 0;

    for (int i = 0; i < NUM_SAMPLES; i++) {
        float d = singleRead();
        if (d > 0) {
            samples[validCount++] = d;
        }
        delay(30); // JSN-SR04T needs ~60 ms between readings, 30 ms is conservative overlap
    }

    if (validCount == 0) return -1.0f;

    // Simple insertion sort for median
    for (int i = 1; i < validCount; i++) {
        float key = samples[i];
        int j = i - 1;
        while (j >= 0 && samples[j] > key) {
            samples[j + 1] = samples[j];
            j--;
        }
        samples[j + 1] = key;
    }

    return samples[validCount / 2]; // median
}
