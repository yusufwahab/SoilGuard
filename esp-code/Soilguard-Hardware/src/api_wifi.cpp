#include "api_wifi.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Wi-Fi Credentials -- point this at your LOCAL router/hotspot.
// That router/hotspot does NOT need internet access; it only needs to be
// the same network your phone/laptop joins so they can reach the ESP32's
// local IP address directly (see the local HTTP server started in main.cpp).
const char* ssid = "TECNO SPARK 30C";
const char* password = "Kennedy.";

// Background Watchdog Tracking Timers
unsigned long lastWiFiCheck = 0;
const unsigned long wifiRetryInterval = 15000; // Probe for reconnection every 15 seconds

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true); // Enable chip-level background connection profiling
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  const int maxAttempts = 20; // 10 seconds timeout

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected! Local telemetry server starting.");
    Serial.print("📶 Local IP Address: "); Serial.println(WiFi.localIP());
    Serial.println("   Point your phone/laptop browser (on the SAME network) at that address.");
  } else {
    Serial.println("\n🌐 WiFi Connection Timeout! System running locally; will auto-connect when hotspot is detected.");
  }
}

void maintainWiFiConnection() {
  unsigned long currentMillis = millis();
  
  // Non-blocking network watchdog
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - lastWiFiCheck >= wifiRetryInterval) {
      lastWiFiCheck = currentMillis;
      Serial.println("🔄 [WiFi Watchdog] Hotspot not found. Retrying in background...");
      WiFi.begin(ssid, password); 
    }
  }
}

// -----------------------------------------------------------------------
// CLOUD (FIREBASE / INTERNET) SYNC -- DISABLED FOR LOCAL-ONLY MODE
// Kept here commented out (not deleted) so it can be switched back on later
// if internet connectivity is ever wanted again. Not called anywhere.
// -----------------------------------------------------------------------
// void sendDataToBackend(const char* crop, float temp, float humid, float moisture, bool pumpOn) {
//   if (WiFi.status() == WL_CONNECTED) {
//     HTTPClient http;
//
//     // Target Endpoint Layout: /farms/{crop}/sensor.json
//     String target_url = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms/";
//     target_url += String(crop) + "/sensor.json";
//
//     http.begin(target_url);
//     http.addHeader("Content-Type", "application/json");
//
//     // Structured JSON containing only temperature, humidity, moisture, and pump state
//     String jsonString = "{";
//     jsonString += "\"temperature\":" + String(temp, 1) + ",";
//     jsonString += "\"humidity\":" + String(humid, 1) + ",";
//     jsonString += "\"moisture\":" + String(moisture, 0) + ",";
//     jsonString += "\"pumpStatus\":" + String(pumpOn ? 1 : 0);
//     jsonString += "}";
//
//     int httpResponseCode = http.PUT(jsonString);
//
//     if (httpResponseCode > 0) {
//       Serial.print("☁️ Firebase ["); Serial.print(crop); Serial.print("] Telemetry Synced. Code: "); Serial.println(httpResponseCode);
//     } else {
//       Serial.print("❌ Cloud Sync Error ["); Serial.print(crop); Serial.print("]: "); Serial.println(httpResponseCode);
//     }
//     http.end();
//   }
// }