# Flood Monitoring System — User Manual

This manual provides instructions for setting up and operating both the **ESP-based Sensor Hardware** and the **Netlify-based Server Backend**.

---

## Part 1: ESP Device Manual (Hardware & Setup)

The ESP device (ESP32 or ESP8266) is the physical sensor unit that measures water levels and pushes data to the cloud.

### 1.1 Hardware Assembly
Connect your ultrasonic sensor (JSN-SR04T) and buzzer to the ESP board:
- **Trig**: GPIO 5 (D1 on D1 Mini)
- **Echo**: GPIO 4 (D2 on D1 Mini)
- **Buzzer**: GPIO 14 (D5 on D1 Mini)
- **VCC/GND**: 5V and Ground

### 1.2 Initial Provisioning
If the device is not yet configured for WiFi, it will enter **Provisioning Mode**.
1. Search for the WiFi network **"FloodMonitor-Setup"** on your smartphone.
2. Connect using password: **`12345678`**.
3. Once connected, open `http://192.168.4.1` in your browser.
4. **Configuration Fields**:
    - **WiFi SSID & Password**: Your home network credentials.
    - **Station Name**: A unique name for this location (e.g., "Antwerpen-Zuid").
    - **River Name**: The river this station belongs to (e.g., "Schelde").
5. Click **Connect**. The device will save these settings and reboot.

### 1.3 LED & Buzzer Indicators
- **Normal**: No buzzer sound.
- **Warning**: Intermittent beeps (triggered when water reaches the warning threshold or rain is expected).
- **Alarm**: Continuous sound (triggered when water reaches the critical alarm threshold).

---

## Part 2: Server & Cloud Manual (Backend & Dashboard)

The server backend resides on Netlify and handles data storage, historical logging, and the web dashboard.

### 2.1 Dynamic Station Registration
The server uses a "Push-to-Register" architecture. You do not need to manually add stations to the server.
- When an ESP device pushes data with a new **Station Name**, the server automatically creates a database entry and starts logging history for it.
- Stations are automatically grouped by **River** in the application interface.

### 2.2 Accessing the Dashboard
The main dashboard is globally accessible via your Netlify URL (e.g., `https://your-app.netlify.app`).
- The dashboard shows a real-time view of all active stations.
- You can filter or view "windows" dedicated to specific rivers.
- **Historical Data**: Click on a station to view the last 24 hours of water level trends.

### 2.3 Management Endpoints
- **Status API**: `/.netlify/functions/get-status` — Returns a JSON object with all current station data.
- **History API**: `/.netlify/functions/get-history?station=Name` — Returns historical data points for a specific station.

### 2.4 Security
- All push requests from the device must include the `FLOOD_API_KEY` defined in the Netlify environment variables.
- The device stores this key internally (flashed at build time in `Config.h`).

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|---|---|---|
| Device won't connect | Incorrect WiFi credentials | Reset the device to re-enter Provisioning Mode. |
| Station not on Dashboard | Wrong API Key or URL | Verify `CLOUD_NETLIFY_URL` and `CLOUD_API_KEY` in `Config.h`. |
| Inaccurate readings | Sensor distance / Obstructions | Ensure the ultrasonic sensor has a clear line of sight to the water surface. |
