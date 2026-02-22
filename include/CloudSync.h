#pragma once
#include <Arduino.h>

namespace CloudSync {
    /**
     * @brief Pushes current system status to the Netlify Cloud Store.
     * 
     * @param distance Internal distance reading (cm)
     * @param warnThr Current warning threshold
     * @param alarmThr Current alarm threshold
     * @param status Current status string ("NORMAL", "WARNING", "ALARM")
     * @param rainExpected Boolean if rain is in forecast
     * @param forecast Text description of forecast
     * @return true if push succeeded
     */
    bool pushData(float distance, float warnThr, float alarmThr, 
                  const String& status, bool rainExpected, const String& forecast);
}
