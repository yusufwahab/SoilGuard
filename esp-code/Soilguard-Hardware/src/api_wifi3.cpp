// // #include "api_wifi.h"
// #include <WiFi.h>
// #include <HTTPClient.h>

// // Wi-Fi Credentials
// const char* ssid = "TECNO SPARK 30C";
// const char* password = "Kennedy.";

// // Background Watchdog Tracking Timers
// unsigned long lastWiFiCheck = 0;
// const unsigned long wifiRetryInterval = 15000; // Probe for reconnection every 15 seconds

// void setupWiFi() {
//   WiFi.mode(WIFI_STA);
//   WiFi.setAutoReconnect(true); // Enable chip-level background connection profiling
//   WiFi.begin(ssid, password);
//   Serial.print("Connecting to WiFi");
  
//   int attempts = 0;
//   const int maxAttempts = 20; // 20 attempts * 500ms delay = 10 seconds timeout

//   while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
//     delay(500);
//     Serial.print(".");
//     attempts++;
//   }
  
//   if (WiFi.status() == WL_CONNECTED) {
//     Serial.println("\n✅ WiFi Connected! System starting in [ONLINE] mode.");
//   } else {
//     Serial.println("\n🌐 WiFi Connection Timeout! System starting in [OFFLINE AUTOMATION] mode.");
//   }
// }

// void maintainWiFiConnection() {
//   unsigned long currentMillis = millis();
  
//   // Non-blocking network watchdog
//   if (WiFi.status() != WL_CONNECTED) {
//     if (currentMillis - lastWiFiCheck >= wifiRetryInterval) {
//       lastWiFiCheck = currentMillis;
//       Serial.println("🔄 [WiFi Watchdog] Connection lost. Searching for network in background...");
//       WiFi.begin(ssid, password); 
//     }
//   }
// }

// void sendDataToBackend(const char* crop, float temp, float humid, float moisture, float ph, float ec, bool pumpOn) {
//   if (WiFi.status() == WL_CONNECTED) {
//     HTTPClient http;
    
//     // Target Endpoint Layout: /farms/{crop}/sensor.json
//     String target_url = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms/";
//     target_url += String(crop) + "/sensor.json";

//     http.begin(target_url);
//     http.addHeader("Content-Type", "application/json");
    
//     String jsonString = "{";
//     jsonString += "\"temperature\":" + String(temp, 2) + ",";
//     jsonString += "\"humidity\":" + String(humid, 2) + ",";
//     jsonString += "\"moisture\":" + String(moisture, 0) + ",";
//     jsonString += "\"pH\":" + String(ph, 2) + ",";
//     jsonString += "\"EC\":" + String(ec, 2) + ",";
//     jsonString += "\"pumpStatus\":" + String(pumpOn ? 1 : 0);
//     jsonString += "}";

//     int httpResponseCode = http.PUT(jsonString);
    
//     if (httpResponseCode > 0) {
//       Serial.print("☁️ Firebase ["); Serial.print(crop); Serial.print("] Update Success! Code: "); Serial.println(httpResponseCode);
//     } else {
//       Serial.print("❌ Error sending PUT request to "); Serial.print(crop); Serial.print(": "); Serial.println(httpResponseCode);
//     }
//     http.end();
//   }
// }

// void checkPumpCommand(const char* crop, int relayPin, bool &pumpRunningState, unsigned long &pumpStartTime, float &targetMoisture) {
//   if (WiFi.status() == WL_CONNECTED) {
//     HTTPClient http;
    
//     // -----------------------------------------------------
//     // PHASE A: FETCH REMOTE PUMP STATE COMMANDS
//     // -----------------------------------------------------
//     String pump_url = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms/";
//     pump_url += String(crop) + "/pump_state.json";

//     http.begin(pump_url);
//     int httpResponseCode = http.GET();
    
//     if (httpResponseCode > 0) {
//       String pump_state = http.getString();
//       pump_state.replace("\"", ""); 
//       pump_state.trim(); 
      
//       if (pump_state == "ON") {
//           if (!pumpRunningState) {
//               pumpStartTime = millis(); // Track runtime timestamp for backup states
//               pumpRunningState = true;
//           }
//           digitalWrite(relayPin, LOW);  // Low closes active-low circuit channel
//           Serial.print("📥 Live Cloud ["); Serial.print(crop); Serial.println("] Pump State: ON");   
//       } else if (pump_state == "OFF") {
//           digitalWrite(relayPin, HIGH); // High breaks active-low circuit channel
//           pumpRunningState = false;
//           Serial.print("📥 Live Cloud ["); Serial.print(crop); Serial.println("] Pump State: OFF");  
//       }
//     } else {
//       Serial.print("❌ Error fetching pump state for "); Serial.print(crop); Serial.print(": "); Serial.println(httpResponseCode);
//     }
//     http.end(); 

//     // -----------------------------------------------------
//     // PHASE B: FETCH DYNAMIC TARGET MOISTURE SETTING
//     // -----------------------------------------------------
//     String target_url = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms/";
//     target_url += String(crop) + "/target_moisture.json";

//     http.begin(target_url);
//     int targetResponseCode = http.GET();

//     if (targetResponseCode > 0) {
//       String target_raw = http.getString();
//       target_raw.replace("\"", "");
//       target_raw.trim();

//       if (target_raw != "null" && target_raw.length() > 0) {
//         targetMoisture = target_raw.toFloat(); // Sync cloud configuration data down to main reference variable
//         Serial.print("🎯 Live Cloud ["); Serial.print(crop); Serial.print("] Target Moisture Threshold Sync: "); Serial.print(targetMoisture, 0); Serial.println("%");
//       }
//     } else {
//       Serial.print("❌ Error fetching target moisture for "); Serial.print(crop); Serial.print(": "); Serial.println(targetResponseCode);
//     }
//     http.end();
//   }
// }