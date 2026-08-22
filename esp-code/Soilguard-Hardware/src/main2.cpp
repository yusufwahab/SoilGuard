// #include <ArduinoJson.h> // Project: Controlling ESP32 for SoilGuard: Local Telemetry Staging
// #include "DHT.h"
// #include <WiFi.h>
// #include "api_wifi.h"

// #define DHTPIN 16               // Safe Flash Pin for DHT11 data lines
// #define DHTTYPE DHT11          
// DHT dht(DHTPIN, DHTTYPE);

// // --- 3-PLOT HARDWARE ASSIGNMENTS ---
// #define MOISTURE_RICE 34        // Rice Moisture Sensor Analog Pin
// #define RELAY_RICE 17           // Safe Flash Pin for Rice Relay Control

// #define MOISTURE_BEANS 32       // Beans Moisture Sensor Analog Pin
// #define RELAY_BEANS 5           // Safe Flash Pin for Beans Relay Control

// #define MOISTURE_YAM 35         // Yam Moisture Sensor Analog Pin
// #define RELAY_YAM 18            // Safe Flash Pin for Yam Relay Control

// const int DRY_VALUE = 2700;    // Calibration base value in dry open air
// const int WET_VALUE = 950;     // Calibration base value in pure water fluids

// // TIMING & SCHEDULER VARIABLES
// unsigned long lastTelemetryTime = 0;
// const unsigned long telemetryInterval = 3000; // Distribute localized prints every 3 seconds

// // INDEPENDENT TIMEOUT TIMESTAMP TRACKERS (Active-Enforced inside Offline Fallback Mode Only)
// unsigned long pumpStartRice = 0;
// unsigned long pumpStartBeans = 0;
// unsigned long pumpStartYam = 0;
// const unsigned long PUMP_TIMEOUT = 10000;     // Critical 10-second automation cutoff gate

// bool isRicePumpRunning = false;
// bool isBeansPumpRunning = false;
// bool isYamPumpRunning = false;

// // SYSTEM STATUS & DYNAMIC APP TARGETS
// bool isOnline = false;

// float targetMoistureRice = 70.0;  // Pre-configured app targets (Overwritten live by endpoint data)
// float targetMoistureBeans = 60.0;
// float targetMoistureYam = 65.0;

// // CRITICAL OFFLINE THRESHOLDS (Triggers autonomous loop execution if network drops completely)
// const float OFFLINE_DRY_THRESHOLD_RICE = 35.0;
// const float OFFLINE_DRY_THRESHOLD_BEANS = 40.0;
// const float OFFLINE_DRY_THRESHOLD_YAM = 30.0;

// void setup() {
//   Serial.begin(115200);
//   Serial.println("Initializing SoilGuard sensors...");
//   dht.begin();
//   delay(2000); 

//   // Initialize output gates under Open-Drain topology to neutralize line leaks
//   pinMode(RELAY_RICE, OUTPUT_OPEN_DRAIN);
//   pinMode(RELAY_BEANS, OUTPUT_OPEN_DRAIN);
//   pinMode(RELAY_YAM, OUTPUT_OPEN_DRAIN);
  
//   // Set output lines High on boot to guarantee active-low switches start in the OFF state
//   digitalWrite(RELAY_RICE, HIGH); 
//   digitalWrite(RELAY_BEANS, HIGH);
//   digitalWrite(RELAY_YAM, HIGH);

//   setupWiFi(); 
//   Serial.println("🚀 Local Test Environment Active! Processing multi-layered routing blocks...\n");

//   pumpStartRice = millis();
//   pumpStartBeans = millis();
//   pumpStartYam = millis();
// }

// void loop() {
//   unsigned long currentTime = millis();

//   // 1. Maintain background automated reconnection watchdogs
//   maintainWiFiConnection();

//   // Update localized operational state flags
//   isOnline = (WiFi.status() == WL_CONNECTED);

//   // --- READ PHYSICAL SENSORS ---
//   float airTemp = dht.readTemperature();
//   float airHumid = dht.readHumidity();

//   if (isnan(airTemp) || isnan(airHumid)) {
//     airTemp = 27.5; 
//     airHumid = 70.0;
//   }

//   // --- READ AND CALIBRATE ALL 3 PLOTS ---
//   int rawRice = analogRead(MOISTURE_RICE);
//   float moistureRice = constrain(map(rawRice, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

//   int rawBeans = analogRead(MOISTURE_BEANS);
//   float moistureBeans = constrain(map(rawBeans, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

//   int rawYam = analogRead(MOISTURE_YAM);
//   float moistureYam = constrain(map(rawYam, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

//   // --- GLOBAL TARGET MOISTURE SHUTOFFS (Applies to both Online and Offline conditions) ---
//   if (isRicePumpRunning && (moistureRice >= targetMoistureRice)) {
//     digitalWrite(RELAY_RICE, HIGH); 
//     isRicePumpRunning = false;
//     Serial.println("\n🎯 AUTO-SHUTOFF: Rice target moisture reached. Pump deactivated.");
//   }
//   if (isBeansPumpRunning && (moistureBeans >= targetMoistureBeans)) {
//     digitalWrite(RELAY_BEANS, HIGH); 
//     isBeansPumpRunning = false;
//     Serial.println("\n🎯 AUTO-SHUTOFF: Beans target moisture reached. Pump deactivated.");
//   }
//   if (isYamPumpRunning && (moistureYam >= targetMoistureYam)) {
//     digitalWrite(RELAY_YAM, HIGH); 
//     isYamPumpRunning = false;
//     Serial.println("\n🎯 AUTO-SHUTOFF: Yam target moisture reached. Pump deactivated.");
//   }

//   // =========================================================================
//   // ROUTING BLOCK A: ONLINE STATE SYSTEM BEHAVIOR (Controlled via App Cloud)
//   // =========================================================================
//   if (isOnline) {
//     if (currentTime - lastTelemetryTime >= telemetryInterval) {
//       lastTelemetryTime = currentTime;

//       // Generate randomized data variables for system validation tasks
//       float phRice = 5.20 + (random(-2, 3) / 100.0);
//       float ecRice = 1.85 + (random(-3, 4) / 100.0);
//       float phBeans = 6.40 + (random(-2, 3) / 100.0);
//       float ecBeans = 1.20 + (random(-3, 4) / 100.0);
//       float phYam = 5.80 + (random(-2, 3) / 100.0);
//       float ecYam = 1.50 + (random(-3, 4) / 100.0);

//       // JSON Contract Prints to local diagnostic stream
//       String jsonRice = "{\"crop\":\"rice\",\"status\":\"online\",\"moisture\":" + String(moistureRice, 0) + ",\"target\":" + String(targetMoistureRice, 0) + ",\"temperature\":" + String(airTemp, 1) + ",\"humidity\":" + String(airHumid, 1) + ",\"pumpStatus\":" + String(isRicePumpRunning ? 1 : 0) + "}";
//       String jsonBeans = "{\"crop\":\"beans\",\"status\":\"online\",\"moisture\":" + String(moistureBeans, 0) + ",\"target\":" + String(targetMoistureBeans, 0) + ",\"temperature\":" + String(airTemp, 1) + ",\"humidity\":" + String(airHumid, 1) + ",\"pumpStatus\":" + String(isBeansPumpRunning ? 1 : 0) + "}";
//       String jsonYam = "{\"crop\":\"yam\",\"status\":\"online\",\"moisture\":" + String(moistureYam, 0) + ",\"target\":" + String(targetMoistureYam, 0) + ",\"temperature\":" + String(airTemp, 1) + ",\"humidity\":" + String(airHumid, 1) + ",\"pumpStatus\":" + String(isYamPumpRunning ? 1 : 0) + "}";

//       // 3. Print all packages cleanly to the Serial Terminal
//       Serial.println(jsonRice);
//       Serial.println(jsonBeans);
//       Serial.println(jsonYam);

//       // Push telemetry array objects to remote endpoints
//       sendDataToBackend("rice", airTemp, airHumid, moistureRice, phRice, ecRice, isRicePumpRunning);
//       sendDataToBackend("beans", airTemp, airHumid, moistureBeans, phBeans, ecBeans, isBeansPumpRunning);
//       sendDataToBackend("yam", airTemp, airHumid, moistureYam, phYam, ecYam, isYamPumpRunning);

//       // Execute endpoint updates and fetch target parameter allocations
//       checkPumpCommand("rice", RELAY_RICE, isRicePumpRunning, pumpStartRice, targetMoistureRice);
//       checkPumpCommand("beans", RELAY_BEANS, isBeansPumpRunning, pumpStartBeans, targetMoistureBeans);
//       checkPumpCommand("yam", RELAY_YAM, isYamPumpRunning, pumpStartYam, targetMoistureYam);
//       Serial.println("-----------------------------------------");
//     }
//   }
//   // =========================================================================
//   // ROUTING BLOCK B: OFFLINE STATE AUTOMATION (Autonomous Local Control)
//   // =========================================================================
//   else {
//     // 1. Automated Local Irrigation Activations (Triggers pump if soil falls below dry line)
//     if (!isRicePumpRunning && (moistureRice < OFFLINE_DRY_THRESHOLD_RICE)) {
//       digitalWrite(RELAY_RICE, LOW); 
//       isRicePumpRunning = true;
//       pumpStartRice = currentTime;
//       Serial.println("\n🚨 OFFLINE AUTO-CONTROL: Rice soil critical! Triggering local backup pump...");
//     }
//     if (!isBeansPumpRunning && (moistureBeans < OFFLINE_DRY_THRESHOLD_BEANS)) {
//       digitalWrite(RELAY_BEANS, LOW); 
//       isBeansPumpRunning = true;
//       pumpStartBeans = currentTime;
//       Serial.println("\n🚨 OFFLINE AUTO-CONTROL: Beans soil critical! Triggering local backup pump...");
//     }
//     if (!isYamPumpRunning && (moistureYam < OFFLINE_DRY_THRESHOLD_YAM)) {
//       digitalWrite(RELAY_YAM, LOW); 
//       isYamPumpRunning = true;
//       pumpStartYam = currentTime;
//       Serial.println("\n🚨 OFFLINE AUTO-CONTROL: Yam soil critical! Triggering local backup pump...");
//     }

//     // 2. Enforce Hard Timeout Safety Overrides while in Offline Isolation
//     if (isRicePumpRunning && (currentTime - pumpStartRice >= PUMP_TIMEOUT)) {
//       digitalWrite(RELAY_RICE, HIGH); 
//       isRicePumpRunning = false;
//       Serial.println("\n⚠️ CRITICAL OFFLINE FAILSAFE: Rice Pump timed out automatically after 10 seconds!");
//     }
//     if (isBeansPumpRunning && (currentTime - pumpStartBeans >= PUMP_TIMEOUT)) {
//       digitalWrite(RELAY_BEANS, HIGH); 
//       isBeansPumpRunning = false;
//       Serial.println("\n⚠️ CRITICAL OFFLINE FAILSAFE: Beans Pump timed out automatically after 10 seconds!");
//     }
//     if (isYamPumpRunning && (currentTime - pumpStartYam >= PUMP_TIMEOUT)) {
//       digitalWrite(RELAY_YAM, HIGH); 
//       isYamPumpRunning = false;
//       Serial.println("\n⚠️ CRITICAL OFFLINE FAILSAFE: Yam Pump timed out automatically after 10 seconds!");
//     }

//     // Local telemetry feedback block
//     if (currentTime - lastTelemetryTime >= telemetryInterval) {
//       lastTelemetryTime = currentTime;
//       Serial.print("📡 Status: [OFFLINE] | Local thresholds enforcing safety profiles. Rice: ");
//       Serial.print(moistureRice, 0); Serial.print("%, Beans: ");
//       Serial.print(moistureBeans, 0); Serial.print("%, Yam: ");
//       Serial.print(moistureYam, 0); Serial.println("%");
//     }
//   }

//   // 3. Serial command listeners for hardware verification and overrides
//   if (Serial.available() > 0) {
//     String command = Serial.readStringUntil('\n');
//     command.trim(); 
    
//     if (command == "RN" && !isRicePumpRunning) {
//       digitalWrite(RELAY_RICE, LOW); isRicePumpRunning = true; pumpStartRice = currentTime;
//       Serial.println("\n--> MANUALLY OVERRIDE: Rice Pump Activated via Serial Terminal Input");
//     } 
//     else if (command == "RF" && isRicePumpRunning) {
//       digitalWrite(RELAY_RICE, HIGH); isRicePumpRunning = false;
//       Serial.println("\n--> MANUALLY OVERRIDE: Rice Pump Deactivated via Serial Terminal Input");
//     }
//     else if (command == "BN" && !isBeansPumpRunning) {
//       digitalWrite(RELAY_BEANS, LOW); isBeansPumpRunning = true; pumpStartBeans = currentTime;
//     } 
//     else if (command == "BF" && isBeansPumpRunning) {
//       digitalWrite(RELAY_BEANS, HIGH); isBeansPumpRunning = false;
//     }
//     else if (command == "YN" && !isYamPumpRunning) {
//       digitalWrite(RELAY_YAM, LOW); isYamPumpRunning = true; pumpStartYam = currentTime;
//     } 
//     else if (command == "YF" && isYamPumpRunning) {
//       digitalWrite(RELAY_YAM, HIGH); isYamPumpRunning = false;
//     }
//   }
// }