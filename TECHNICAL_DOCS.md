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
Allows manual override of the sensor distance for testing.

**URL**: `/simulate`  
**Method**: `POST`  
**Parameters**:
- `active`: `"true"` or `"false"`
- `distance`: Float value (e.g., `12.5`)

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

### 6. Cloud Push (Device/Simulation)
Used by the ESP8266 or the App's Simulation Mode to update the shared state.

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
