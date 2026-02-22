#pragma once
#include <Arduino.h>

/// Manages WiFi provisioning via AP captive portal + Preferences storage.
namespace WiFiProv {
    /// Attempt to connect using stored credentials.
    /// Returns true if connected, false if no creds or connection failed.
    bool connectFromStored();

    /// Start AP captive portal. Blocks until credentials are submitted.
    /// After submission, saves creds and reboots.
    void startProvisioningPortal();

    /// Returns the local IP address as a String (valid after connectFromStored() succeeds).
    String getLocalIP();

    /// Clear stored WiFi credentials (useful for re-provisioning).
    void clearCredentials();
}
