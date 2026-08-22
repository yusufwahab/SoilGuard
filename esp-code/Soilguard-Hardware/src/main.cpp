#include <ArduinoJson.h> 
#include "DHT.h"
#include <WiFi.h>
#include "api_wifi.h"

#define DHTPIN 16               // Safe Flash Pin for DHT11 data lines
#define DHTTYPE DHT11          
DHT dht(DHTPIN, DHTTYPE);

// --- 3-PLOT HARDWARE ASSIGNMENTS ---
#define MOISTURE_RICE 34        // Rice Moisture Sensor Analog Pin
#define RELAY_RICE 17           // Safe Flash Pin for Rice Relay Control

#define MOISTURE_BEANS 32       // Beans Moisture Sensor Analog Pin
#define RELAY_BEANS 5           // Safe Flash Pin for Beans Relay Control

#define MOISTURE_YAM 35         // Yam Moisture Sensor Analog Pin (Kept for local monitor)
#define RELAY_YAM 18            // Safe Flash Pin for Yam Relay Control (Kept for local monitor)

const int DRY_VALUE = 2700;    // Calibration base value in dry open air
const int WET_VALUE = 950;     // Calibration base value in pure water fluids

// TIMING & SCHEDULER VARIABLES
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 3000; // Distribute localized prints every 3 seconds

bool isRicePumpRunning = false;
bool isBeansPumpRunning = false;
bool isYamPumpRunning = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("      SOILGUARD HYBRID ONE-WAY TELEMETRY MODE     ");
  Serial.println("==================================================");
  
  dht.begin();

  // Initialize output gates under Open-Drain topology to neutralize line leaks
  pinMode(RELAY_RICE, OUTPUT_OPEN_DRAIN);
  pinMode(RELAY_BEANS, OUTPUT_OPEN_DRAIN);
  pinMode(RELAY_YAM, OUTPUT_OPEN_DRAIN);
  
  // Set output lines High on boot to guarantee active-low switches start in the OFF state
  digitalWrite(RELAY_RICE, HIGH); 
  digitalWrite(RELAY_BEANS, HIGH);
  digitalWrite(RELAY_YAM, HIGH);

  // Initialize background WiFi stack
  setupWiFi(); 
  
  Serial.println("\n🚀 System Operational. Use Serial commands to control pumps manually:");
  Serial.println("  [RN / RF] -> Rice Pump ON / OFF");
  Serial.println("  [BN / BF] -> Beans Pump ON / OFF");
  Serial.println("  [YN / YF] -> Yam Pump ON / OFF");
  Serial.println("--------------------------------------------------\n");
}

void loop() {
  unsigned long currentTime = millis();

  // 1. Silently handle background automated reconnection tracking
  maintainWiFiConnection();

  // --- READ PHYSICAL SENSORS ---
  float airTemp = dht.readTemperature();
  float airHumid = dht.readHumidity();

  if (isnan(airTemp) || isnan(airHumid)) {
    airTemp = 27.5; 
    airHumid = 70.0;
  }

  // --- READ AND CALIBRATE ALL SENSORS ---
  int rawRice = analogRead(MOISTURE_RICE);
  float moistureRice = constrain(map(rawRice, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

  int rawBeans = analogRead(MOISTURE_BEANS);
  float moistureBeans = constrain(map(rawBeans, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

  int rawYam = analogRead(MOISTURE_YAM);
  float moistureYam = constrain(map(rawYam, DRY_VALUE, WET_VALUE, 0, 100), 0, 100); 

  // --- TIMED DATA REPORTING & WI-FI TRANSMISSION BLOCK ---
  if (currentTime - lastTelemetryTime >= telemetryInterval) {
    lastTelemetryTime = currentTime;

    // A. Local Terminal Prints (Shows everything including Yam for your eyes)
    Serial.println("📊 --- LOCAL MONITOR REPORT ---");
    Serial.print("  [ENV] Temp: "); Serial.print(airTemp, 1); Serial.print("°C | Humid: "); Serial.print(airHumid, 1); Serial.println("%");
    Serial.print("  [RICE]  Moisture: "); Serial.print(moistureRice, 0); Serial.print("% | Pump: "); Serial.println(isRicePumpRunning ? "ON" : "OFF");
    Serial.print("  [BEANS] Moisture: "); Serial.print(moistureBeans, 0); Serial.print("% | Pump: "); Serial.println(isBeansPumpRunning ? "ON" : "OFF");
    Serial.print("  [YAM]   Moisture: "); Serial.print(moistureYam, 0); Serial.print("% | Pump: "); Serial.println(isYamPumpRunning ? "ON" : "OFF");

    // B. Wi-Fi Cloud Upload (Exclusively uploads Rice and Beans datasets to Firebase)
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToBackend("rice", airTemp, airHumid, moistureRice, isRicePumpRunning);
      sendDataToBackend("beans", airTemp, airHumid, moistureBeans, isBeansPumpRunning);
    } else {
      Serial.println("📡 Network Offline -> Skipping cloud telemetry transmission.");
    }
    Serial.println("--------------------------------------------------");
  }

  // =========================================================================
  // 2. SERIAL COMMAND LISTENERS (Exclusive Pump Trigger Hub)
  // =========================================================================
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); 
    command.toUpperCase();
    
    // RICE MANUAL OVERRIDES
    if (command == "RN") {
      digitalWrite(RELAY_RICE, LOW); // Low closes Active-Low channel (PUMP ON)
      isRicePumpRunning = true;
      Serial.println("\n🟩 [SERIAL EXECUTION] -> Rice Pump manually turned ON.");
    } 
    else if (command == "RF") {
      digitalWrite(RELAY_RICE, HIGH); // High breaks Active-Low channel (PUMP OFF)
      isRicePumpRunning = false;
      Serial.println("\n🟥 [SERIAL EXECUTION] -> Rice Pump manually turned OFF.");
    }
    
    // BEANS MANUAL OVERRIDES
    else if (command == "BN") {
      digitalWrite(RELAY_BEANS, LOW); 
      isBeansPumpRunning = true;
      Serial.println("\n🟩 [SERIAL EXECUTION] -> Beans Pump manually turned ON.");
    } 
    else if (command == "BF") {
      digitalWrite(RELAY_BEANS, HIGH); 
      isBeansPumpRunning = false;
      Serial.println("\n🟥 [SERIAL EXECUTION] -> Beans Pump manually turned OFF.");
    }
    
    // YAM MANUAL OVERRIDES
    else if (command == "YN") {
      digitalWrite(RELAY_YAM, LOW); 
      isYamPumpRunning = true;
      Serial.println("\n🟩 [SERIAL EXECUTION] -> Yam Pump manually turned ON.");
    } 
    else if (command == "YF") {
      digitalWrite(RELAY_YAM, HIGH); 
      isYamPumpRunning = false;
      Serial.println("\n🟥 [SERIAL EXECUTION] -> Yam Pump manually turned OFF.");
    }
  }
}