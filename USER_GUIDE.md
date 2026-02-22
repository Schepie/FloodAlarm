# ESP8266 Flood Monitor — User Guide

This guide explains how to set up and operate your Flood Monitoring System on an ESP8266 (D1 Mini).

## 1. Hardware Connections (D1 Mini)

Connect your components to the following pins on your D1 Mini:

| Component | D1 Mini Pin | GPIO | Note |
|---|---|---|---|
| **JSN-SR04T Trig** | **D1** | GPIO 5 | |
| **JSN-SR04T Echo** | **D2** | GPIO 4 | Connected to the Echo line |
| **Active Buzzer** | **D5** | GPIO 14 | Connect positive lead to pin, negative to GND |
| **Power** | 5V / GND | - | Power the sensor and board with 5V |

> [!IMPORTANT]
> **JSN-SR04T sensor** needs 5V to operate correctly. Ensure your power supply is stable.

## 2. WiFi Connection Modes

The device supports two ways to connect to your network. You can switch between these in `include/Config.h`.

### Mode A: Automatic Connection (Preferred)
*Active when `WIFI_FORCE_CONFIG` is set to `true`.*
1.  Open `include/Config.h`.
2.  Enter your credentials in `WIFI_SSID` and `WIFI_PASSWORD`.
3.  Upload the code. The device will connect immediately.

### Mode B: Manual Setup (Provisioning Portal)
*Active when `WIFI_FORCE_CONFIG` is set to `false`.*
1.  Connect your phone to the WiFi network: **FloodMonitor-Setup**.
2.  Password: **`12345678`**.
3.  A portal should open (or go to `http://192.168.4.1`).
4.  Enter your home WiFi details and click **Save**.

## 3. Accessing the Dashboard

Once connected, find the device IP (printed in the Serial Monitor) and open it in your browser:
`http://<DEVICE_IP>/`

## 4. Understanding the Dashboard

-   **Water Level**: Current distance from sensor to water (lower = higher water).
-   **Status Badge**: 
    -   **NORMAL**: All good.
    -   **WARNING**: Water rising (Buzzer beeps).
    -   **ALARM**: Flooding! (Buzzer sounds continuously).
-   **Weather Status**: Shows current forecast. If rain is expected, thresholds become **20% more sensitive**.
-   **History Chart**: Last 24 hours of data.

## 5. Sensor Simulation (Testing)

To test the system without real water:
1.  Locate the **Simulation Mode** card on the dashboard.
2.  Toggle to **ENABLE**.
3.  Use the slider to move the "water level" and verify the buzzer/status responds as expected.

## 6. Configuration Settings

Advanced settings are located in `include/Config.h`:
- `DEFAULT_WARNING_CM`: Distance for Warning.
- `DEFAULT_ALARM_CM`: Distance for Alarm.
- `OWM_CITY`: Set your city for weather forecasts.
- `WIFI_FORCE_CONFIG`: Toggle between Mode A and Mode B above.
- `NOTIFICATIONS_ENABLED`: Set to `true` to enable Telegram alerts.

## 7. Telegram Notifications (Mobile Alerts)

To receive alerts on your phone:

### Step 1: Create a Bot
1. Search for **@BotFather** on Telegram.
2. Send `/newbot`.
3. Follow the steps to name your bot. 
4. Copy the **HTTP API Token** it provides.

### Step 2: Get your Chat ID
1. Search for **@userinfobot** on Telegram.
2. Send any message.
3. It will reply with your **Id** (a number).

### Step 3: Update Config.h
1. Open `include/Config.h`.
2. Paste your token into `TELEGRAM_BOT_TOKEN`.
3. Paste your ID into `TELEGRAM_CHAT_ID`.
4. Upload the code.

> [!NOTE]
> The system will only send one notification every 30 minutes to avoid spamming your phone.
