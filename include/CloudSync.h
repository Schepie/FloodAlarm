#pragma once
#include <Arduino.h>

namespace CloudSync {
    struct CloudConfig {
        int32_t nextIntervalS = -1;
        float warningThreshold = -1.0f;
        float alarmThreshold = -1.0f;
        bool success = false;
    };

    /**
     * @brief Pushes current monitoring data to Netlify.
     * @param distance Measured water level
     * @param warnThr Current warning threshold
     * @param alarmThr Current alarm threshold
     * @param status Current status (NORMAL, WARNING, ALARM)
     * @param rainExpected Boolean weather condition
     * @param forecast Text description of forecast
     * @return CloudConfig containing updated settings from server
     */
    CloudConfig pushData(float distance, float warnThr, float alarmThr, 
                        const String& status, bool rainExpected, const String& forecast);


    /**
     * @brief Triggers a station migration on the server (rename/move data).
     * 
     * @param oldName The previous station name
     * @param newName The new station name
     * @param river The river name
     * @return true if migration triggered successfully
     */
    bool migrateStation(const String& oldName, const String& newName, const String& river);

}
