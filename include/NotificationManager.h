#pragma once
#include <Arduino.h>

namespace NotificationMgr {
    /// Send a message to Telegram.
    /// @param message The text to send.
    /// @return true if successfully sent.
    bool sendTelegram(const String& message);
}
