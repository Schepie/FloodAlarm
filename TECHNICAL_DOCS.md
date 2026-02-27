# Flood Monitor API Documentation

This document describes the API endpoints available on the ESP8266 Flood Monitor for mobile app integration.

## Base URL
`http://<DEVICE_IP>/api`

## Endpoints

### 1. System Status
Returns the real-time sensor data and system state.

**URL**: `/status`  
**Method**: `GET`  
**Response Format**: `JSON`

#### Example Response
```json
{
  "distance": 42.5,
  "warning": 30.0,
  "alarm": 15.0,
  "rainExpected": false,
  "forecast": "Clear sky",
  "entries": 54,
  "status": "NORMAL"
}
```

*Note: `distance` will be `-1.0` if the sensor hasn't reported a value yet.*

---

### 2. Historical Data
Returns the last 24 hours of logged sensor readings.

**URL**: `/history?format=json`  
**Method**: `GET`  
**Response Format**: `JSON` (or `CSV` if format param is omitted)

#### Example Response
```json
{
  "unit": "cm",
  "data": [
    {"ts": 1708612345, "val": 45.2},
    {"ts": 1708612945, "val": 44.8}
  ]
}
```

---

### 3. Simulation Control
Allows triggering a manual override for the sensor level to test UI reaction and flood scenarios.

**URL**: `/simulate`  
**Method**: `POST`  
**Parameters**:
- `active`: `"true"` or `"false"`
- `distance`: Float value in cm (eg. `10.5`)

**Response**: `200 OK`

---

### 4. Custom Notification (Post Message)
Allows sending a manual message to Telegram via the ESP8266.

**URL**: `/notify`  
**Method**: `POST`  
**Parameters**:
- `message`: The text string to send.

**Response**: `200 Sent` or `500 Failed`.

---

---

## CORS
The endpoints include the `Access-Control-Allow-Origin: *` header, allowing them to be called directly from web-based mobile apps (like React Native or Capacitor).

---

## Cloud Push Architecture

The ESP8266 is configured to push data to a central cloud store (Netlify Blobs) every 15 seconds. This allows the mobile app to receive updates even when not on the same local network.

### 5. Cloud Status Retrieval
The app retrieves the latest stored status from the cloud.

**URL**: `/.netlify/functions/get-status`  
**Method**: `GET`  
**Response Format**: `JSON`

### 6. Cloud Push (Device)
Used by the ESP8266 to update the shared state.

**URL**: `/.netlify/functions/push-status`  
**Method**: `POST`  
**Auth**: Handled via `Authorization` header or `key` query param.
**Body**:
```json
{
  "distance": 42.5,
  "warning": 30.0,
  "alarm": 15.0,
  "status": "NORMAL",
  "forecast": "Clear sky",
  "rainExpected": false
}
```

---

## Coupling & River Grouping Strategy

To support multi-station and multi-river deployments, the system uses a dynamic registration pattern.

### 1. Provisioning
During the initial set-up (WiFi Provisioning), the user must provide:
- **Station Name**: A descriptive name for the sensor location (eg. "Antwerpen-Zuid").
- **River**: The name of the river or water body (eg. "Schelde").

### 2. Implementation Details
- **ESP32/ESP8266**: Stores these values and sends them in every JSON push to the server.
- **Server**: Automatically creates or updates the station entry based on the `station` name.
- **Grouping**: The server includes the `river` metadata in the status response, allowing the app to group stations by river automatically.
