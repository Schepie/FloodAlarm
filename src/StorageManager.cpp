#include "StorageManager.h"
#include "Config.h"
#include <LittleFS.h>
#include <vector>

void StorageMgr::begin() {
  if (!LittleFS.begin()) {
    Serial.println("[Storage] LittleFS mount FAILED!");
    return;
  }
  Serial.println("[Storage] LittleFS mounted.");

  // Create CSV with header if it doesn't exist
  if (!LittleFS.exists(HISTORY_PATH)) {
    File f = LittleFS.open(HISTORY_PATH, "w");
    if (f) {
      f.println("timestamp,distance_cm");
      f.close();
      Serial.println("[Storage] Created " + String(HISTORY_PATH));
    }
  } else {
    Serial.println("[Storage] " + String(HISTORY_PATH) + " already exists.");
  }
}

void StorageMgr::logReading(unsigned long epochSeconds, float distanceCm) {
  int count = getEntryCount();

  if (count < MAX_CSV_ENTRIES) {
    // Just append
    File f = LittleFS.open(HISTORY_PATH, "a");
    if (f) {
      f.printf("%lu,%.1f\n", epochSeconds, distanceCm);
      f.close();
    }
    Serial.printf("[Storage] Appended: %lu, %.1f cm (%d/%d)\n", epochSeconds,
                  distanceCm, count + 1, MAX_CSV_ENTRIES);
    return;
  }

  // Rotation needed: Copy header + all lines except the first data line to a
  // temp file
  Serial.println("[Storage] Rotating history...");
  File src = LittleFS.open(HISTORY_PATH, "r");
  File dst = LittleFS.open("/temp.csv", "w");

  if (!src || !dst) {
    if (src)
      src.close();
    if (dst)
      dst.close();
    return;
  }

  // Copy header
  String header = src.readStringUntil('\n');
  dst.println(header);

  // Skip the first data line
  src.readStringUntil('\n');

  // Copy remaining lines
  while (src.available()) {
    String line = src.readStringUntil('\n');
    if (line.length() > 0) {
      dst.println(line);
    }
    yield(); // Feed the watchdog
  }

  // Add new reading
  dst.printf("%lu,%.1f\n", epochSeconds, distanceCm);

  src.close();
  dst.close();

  // Swap files
  LittleFS.remove(HISTORY_PATH);
  LittleFS.rename("/temp.csv", HISTORY_PATH);

  Serial.printf("[Storage] Rotated: %lu, %.1f cm\n", epochSeconds, distanceCm);
}

String StorageMgr::getCSV() {
  File f = LittleFS.open(HISTORY_PATH, "r");
  if (!f)
    return "timestamp,distance_cm\n";
  String content = f.readString();
  f.close();
  return content;
}

int StorageMgr::getEntryCount() {
  File f = LittleFS.open(HISTORY_PATH, "r");
  if (!f)
    return 0;
  int count = -1; // subtract header
  while (f.available()) {
    f.readStringUntil('\n');
    count++;
  }
  f.close();
  return count < 0 ? 0 : count;
}
