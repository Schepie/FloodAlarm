#include "WiFiProvisioning.h"
#include "Config.h"
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

static Preferences prefs;

// ─── Simple HTML provisioning page ──────────────────────────────────────────
static const char PROV_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FloodMonitor WiFi Setup</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;
       display:flex;justify-content:center;align-items:center;height:100vh}
  .card{background:#1e293b;border-radius:16px;padding:2rem;width:90%;max-width:380px;
        box-shadow:0 8px 32px rgba(0,0,0,.4)}
  h1{font-size:1.3rem;margin-bottom:.5rem;color:#38bdf8}
  p{font-size:.85rem;color:#94a3b8;margin-bottom:1.5rem}
  label{display:block;font-size:.8rem;color:#94a3b8;margin-bottom:.25rem}
  input{width:100%;padding:.65rem .8rem;border:1px solid #334155;border-radius:8px;
        background:#0f172a;color:#e2e8f0;font-size:.95rem;margin-bottom:1rem;outline:none}
  input:focus{border-color:#38bdf8}
  button{width:100%;padding:.75rem;background:linear-gradient(135deg,#0ea5e9,#6366f1);
         border:none;border-radius:8px;color:#fff;font-size:1rem;cursor:pointer;
         font-weight:600;letter-spacing:.3px}
  button:hover{opacity:.9}
</style>
</head>
<body>
<div class="card">
  <h1>&#x1F30A; Flood Monitor Setup</h1>
  <p>Enter your WiFi credentials to connect the sensor to your network.</p>
  <form method="POST" action="/save">
    <label for="ssid">WiFi SSID</label>
    <input id="ssid" name="ssid" type="text" required placeholder="Your network name">
    <label for="pass">Password</label>
    <input id="pass" name="pass" type="password" placeholder="Network password">
    
    <label for="station">Station Name</label>
    <input id="station" name="station" type="text" placeholder="eg. Antwerpen-Zuid">
    
    <label for="river">River Name</label>
    <input id="river" name="river" type="text" placeholder="eg. Schelde">
    
    <button type="submit">Connect &rarr;</button>
  </form>

</div>
</body>
</html>
)rawliteral";

static const char PROV_DONE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saved</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;
display:flex;justify-content:center;align-items:center;height:100vh}
.card{background:#1e293b;border-radius:16px;padding:2rem;text-align:center;max-width:360px}
h1{color:#22c55e;margin-bottom:.5rem}p{color:#94a3b8;font-size:.9rem}</style>
</head><body><div class="card"><h1>&#x2705; Saved!</h1>
<p>Credentials stored. The device will now reboot and connect to your network.</p>
</div></body></html>
)rawliteral";

// ─── Implementation ────────────────────────────────────────────────────────

bool WiFiProv::connectFromStored() {
    // Open in read-write mode (false) prevents the NOT_FOUND error on first boot
    prefs.begin("wifi", false); 
    String ssid = prefs.getString("ssid", "");
    String pass = prefs.getString("pass", "");
    prefs.end();

    if (ssid.length() == 0) {
        Serial.println("[WiFi] No stored credentials found.");
        return false;
    }

    Serial.printf("[WiFi] Attempting connection to SSID: '%s'\n", ssid.c_str());
    // Note: Printing password for debugging only; recommend removing after fix
    Serial.printf("[WiFi] Using Password: '%s'\n", pass.c_str());

    WiFi.persistent(false);
    WiFi.disconnect();
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] Connected!  IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }

    int statusCode = WiFi.status();
    Serial.printf("[WiFi] Connection failed. Status Code: %d\n", statusCode);
    
    switch (statusCode) {
        case WL_NO_SSID_AVAIL: Serial.println("[WiFi] Error: SSID not found."); break;
        case WL_CONNECT_FAILED: Serial.println("[WiFi] Error: Connection failed (usually timeout)."); break;
        case WL_WRONG_PASSWORD: Serial.println("[WiFi] Error: Wrong password (6)."); break;
        case WL_DISCONNECTED: Serial.println("[WiFi] Error: Disconnected (7) - check SSID/Pass or Router."); break;
        default: Serial.printf("[WiFi] Error: Unknown failure (%d).\n", statusCode); break;
    }

    WiFi.disconnect(true);
    return false;
}

void WiFiProv::startProvisioningPortal() {
    Serial.println("[WiFi] AP Setup: Zero-Reset Start...");
    Serial.flush();
    
    // Limit power before starting radio
    WiFi.mode(WIFI_AP);
    delay(100);

    // Directly call softAP. 
    bool success = WiFi.softAP(AP_SSID, "12345678"); 
    
    if (success) {
        delay(500);
        Serial.println("[WiFi] SUCCESS: AP is active.");
        Serial.print("[WiFi] IP Address: ");
        Serial.println(WiFi.softAPIP());
        Serial.flush();
    } else {
        Serial.println("[WiFi] ERROR: softAP failed to start.");
        Serial.flush();
    }
    

    ESP8266WebServer server(80);

    server.on("/", HTTP_GET, [&server]() {
        server.send_P(200, "text/html", PROV_PAGE);
    });

    server.on("/save", HTTP_POST, [&server]() {
        String ssid = server.arg("ssid");
        String pass = server.arg("pass");
        String station = server.arg("station");
        String river = server.arg("river");
        
        ssid.trim();
        pass.trim();
        station.trim();
        river.trim();

        if (ssid.length() > 0) {
            prefs.begin("wifi", false);
            prefs.putString("ssid", ssid);
            prefs.putString("pass", pass);
            
            if (station.length() > 0) prefs.putString("station", station);
            if (river.length() > 0) prefs.putString("river", river);
            
            prefs.end();
            Serial.printf("[WiFi] Stored creds: SSID='%s', Station='%s', River='%s'. Rebooting...\n", 
                          ssid.c_str(), station.c_str(), river.c_str());
        }


        server.send_P(200, "text/html", PROV_DONE);
        delay(2000);
        ESP.restart();
    });

    // Captive portal: redirect all unknown requests to the setup page
    server.onNotFound([&server]() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    DNSServer dnsServer;
    dnsServer.start(53, "*", WiFi.softAPIP());

    server.begin();
    Serial.println("[WiFi] Portal active — connect to AP and open 192.168.4.1");

    // Block here until credentials are submitted (device reboots on save)
    while (true) {
        dnsServer.processNextRequest();
        server.handleClient();
        delay(2);
    }
}

String WiFiProv::getLocalIP() {
    return WiFi.localIP().toString();
}

void WiFiProv::clearCredentials() {
    prefs.begin("wifi", false);
    prefs.clear();
    prefs.end();
    Serial.println("[WiFi] Credentials cleared.");
}
