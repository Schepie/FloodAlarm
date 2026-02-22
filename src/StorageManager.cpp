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
    // ── Trim if over limit ──────────────────────────────────────────────
    // Read all lines, keep only the last (MAX_CSV_ENTRIES - 1) + header
    File f = LittleFS.open(HISTORY_PATH, "r");
    if (!f) return;

    String header = f.readStringUntil('\n');
    std::vector<String> lines;
    while (f.available()) {
        String line = f.readStringUntil('\n');
        line.trim();
        if (line.length() > 0) lines.push_back(line);
    }
    f.close();

    // If at limit, remove oldest entries
    while ((int)lines.size() >= MAX_CSV_ENTRIES) {
        lines.erase(lines.begin());
    }

    // Append new reading
    String newLine = String(epochSeconds) + "," + String(distanceCm, 1);
    lines.push_back(newLine);

    // Rewrite file
    f = LittleFS.open(HISTORY_PATH, "w");
    if (!f) return;
    f.println(header);
    for (auto& l : lines) {
        f.println(l);
    }
    f.close();

    Serial.printf("[Storage] Logged: %lu, %.1f cm  (%d entries)\n",
                  epochSeconds, distanceCm, (int)lines.size());
}

String StorageMgr::getCSV() {
    File f = LittleFS.open(HISTORY_PATH, "r");
    if (!f) return "timestamp,distance_cm\n";
    String content = f.readString();
    f.close();
    return content;
}

int StorageMgr::getEntryCount() {
    File f = LittleFS.open(HISTORY_PATH, "r");
    if (!f) return 0;
    int count = -1; // subtract header
    while (f.available()) {
        f.readStringUntil('\n');
        count++;
    }
    f.close();
    return count < 0 ? 0 : count;
}
