#pragma once
#include <Arduino.h>

/// Manages LittleFS-based CSV history logging.
namespace StorageMgr {
    /// Mount LittleFS and create history.csv if it doesn't exist.
    void begin();

    /// Append a timestamped reading to history.csv.
    void logReading(unsigned long epochSeconds, float distanceCm);

    /// Return the full CSV content as a String (for serving via HTTP).
    String getCSV();

    /// Returns the number of entries currently stored.
    int getEntryCount();
}
