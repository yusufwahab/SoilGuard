#include <ArduinoJson.h>
#include "DHT.h"
#include <WiFi.h>
#include <WebServer.h>
#include "api_wifi.h"

#define DHTPIN 32 
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// --- SAFE 3-PLOT HARDWARE ASSIGNMENTS ---
#define MOISTURE_RICE  36   // SVP pin (ADC1)
#define RELAY_RICE     16   // Safe Digital Output

#define MOISTURE_BEANS 39   // SVN pin (ADC1)
#define RELAY_BEANS    17   // Safe Digital Output

#define MOISTURE_YAM   35   // P34 pin (ADC1)
#define RELAY_YAM      18   // Safe Digital Output

// --- SOLAR PANEL VOLTAGE MONITOR ---
// One panel powers the whole node, so this reading is system-wide (served on
// every crop endpoint, not per-plot). Wired through a resistive voltage-divider
// module on GPIO 35 -- an input-only ADC1 pin (ADC1 keeps working while Wi-Fi
// is on; ADC2 does not). Pins 32/34/36/39 are already taken by the DHT11 and
// the three moisture probes, so 35 is the free ADC1 pin.
const int SOLAR_PIN               = 34;   // ADC1 input-only pin for the divider's signal wire
const float SOLAR_V_REF         = 3.3;  // ESP32 ADC full-scale reference voltage
const float SOLAR_DIVIDER_RATIO = 5.0;  // voltage-sensor module ratio (Vin / Vpin)

const int DRY_VALUE = 2700;    // Calibration base value in dry open air
const int WET_VALUE = 950;     // Calibration base value in pure water fluids

// TIMING & SCHEDULER VARIABLES
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 3000; // Distribute localized prints every 3 seconds

bool isRicePumpRunning = false;
bool isBeansPumpRunning = false;
bool isYamPumpRunning = false;

// LATEST SENSOR READINGS -- kept global so the local HTTP server handlers
// (fired from inside server.handleClient()) can always serve the freshest values.
// Air temp/humidity from the DHT11 on DHTPIN (pin 32). Start as NAN -- "no
// reading yet" -- so a disconnected or failed sensor is NEVER masked behind a
// fake default value. Only a genuine DHT11 read ever fills these in; the JSON
// server reports null (not a made-up number) until then.
float airTemp = NAN;
float airHumid = NAN;
bool  dhtOk = false;                        // did the most recent DHT11 read succeed?
unsigned long lastDhtReadTime = 0;
const unsigned long dhtReadInterval = 2000; // DHT11 samples at ~1Hz -- don't poll it faster
float moistureRice = 0;
float moistureBeans = 0;
float moistureYam = 0;
float solarVoltage = 0.0;  // latest solar-panel voltage (V); system-wide, served on every endpoint

// -----------------------------------------------------------------------
// LOCAL-ONLY HTTP JSON SERVER
// Replaces the old Firebase/internet upload. Runs entirely on the LAN --
// your router does NOT need internet access. Any device on the same
// Wi-Fi (phone, laptop, the SoilGuard web app) can hit these endpoints
// using the ESP32's local IP address (printed to Serial after Wi-Fi connects).
// -----------------------------------------------------------------------
WebServer server(80);

void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

String buildSensorJson(float moisture, bool pumpOn) {
  String json = "{";
  // Serve real DHT11 readings only. If the sensor has never returned a valid
  // value, send JSON null (not a fake default) so the dashboard can show it as
  // "no data" instead of a fabricated temperature/humidity.
  json += "\"temperature\":" + (isnan(airTemp)  ? String("null") : String(airTemp, 1))  + ",";
  json += "\"humidity\":"    + (isnan(airHumid) ? String("null") : String(airHumid, 1)) + ",";
  json += "\"moisture\":" + String(moisture, 0) + ",";
  // Solar bus voltage is system-wide (one panel powers the whole node), so the
  // same reading is served on every crop endpoint.
  json += "\"solarVoltage\":" + String(solarVoltage, 2) + ",";
  json += "\"pumpStatus\":" + String(pumpOn ? 1 : 0);
  json += "}";
  return json;
}

void handleRoot() {
  sendCORSHeaders();
  String html = "<h2>SoilGuard Local Server</h2><p>Status: Online (LAN only, no internet used)</p>";
  html += "<p>Endpoints: /api/sensor, /api/sensor/rice, /api/sensor/beans, /api/sensor/yam</p>";
  html += "<p>Pump control: /api/pump/rice/on, /api/pump/rice/off (and beans / yam)</p>";
  server.send(200, "text/html", html);
}

void handleSensorRice() {
  sendCORSHeaders();
  server.send(200, "application/json", buildSensorJson(moistureRice, isRicePumpRunning));
}

void handleSensorBeans() {
  sendCORSHeaders();
  server.send(200, "application/json", buildSensorJson(moistureBeans, isBeansPumpRunning));
}

void handleSensorYam() {
  sendCORSHeaders();
  server.send(200, "application/json", buildSensorJson(moistureYam, isYamPumpRunning));
}

void handleSensorAll() {
  sendCORSHeaders();
  String json = "{";
  json += "\"rice\":" + buildSensorJson(moistureRice, isRicePumpRunning) + ",";
  json += "\"beans\":" + buildSensorJson(moistureBeans, isBeansPumpRunning) + ",";
  json += "\"yam\":" + buildSensorJson(moistureYam, isYamPumpRunning);
  json += "}";
  server.send(200, "application/json", json);
}

void handlePumpRiceOn() {
  digitalWrite(RELAY_RICE, LOW); // Low closes Active-Low channel (PUMP ON)
  isRicePumpRunning = true;
  Serial.println("\n🟩 [LOCAL API] -> Rice Pump turned ON via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"rice\",\"pumpStatus\":1}");
}

void handlePumpRiceOff() {
  digitalWrite(RELAY_RICE, HIGH); // High breaks Active-Low channel (PUMP OFF)
  isRicePumpRunning = false;
  Serial.println("\n🟥 [LOCAL API] -> Rice Pump turned OFF via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"rice\",\"pumpStatus\":0}");
}

void handlePumpBeansOn() {
  digitalWrite(RELAY_BEANS, LOW);
  isBeansPumpRunning = true;
  Serial.println("\n🟩 [LOCAL API] -> Beans Pump turned ON via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"beans\",\"pumpStatus\":1}");
}

void handlePumpBeansOff() {
  digitalWrite(RELAY_BEANS, HIGH);
  isBeansPumpRunning = false;
  Serial.println("\n🟥 [LOCAL API] -> Beans Pump turned OFF via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"beans\",\"pumpStatus\":0}");
}

void handlePumpYamOn() {
  digitalWrite(RELAY_YAM, LOW);
  isYamPumpRunning = true;
  Serial.println("\n🟩 [LOCAL API] -> Yam Pump turned ON via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"yam\",\"pumpStatus\":1}");
}

void handlePumpYamOff() {
  digitalWrite(RELAY_YAM, HIGH);
  isYamPumpRunning = false;
  Serial.println("\n🟥 [LOCAL API] -> Yam Pump turned OFF via local network request.");
  sendCORSHeaders();
  server.send(200, "application/json", "{\"crop\":\"yam\",\"pumpStatus\":0}");
}

void handleNotFound() {
  sendCORSHeaders();
  server.send(404, "application/json", "{\"error\":\"not found\"}");
}

void setupLocalServer() {
  server.on("/", handleRoot);
  server.on("/api/sensor", handleSensorAll);
  server.on("/api/sensor/rice", handleSensorRice);
  server.on("/api/sensor/beans", handleSensorBeans);
  server.on("/api/sensor/yam", handleSensorYam);
  server.on("/api/pump/rice/on", handlePumpRiceOn);
  server.on("/api/pump/rice/off", handlePumpRiceOff);
  server.on("/api/pump/beans/on", handlePumpBeansOn);
  server.on("/api/pump/beans/off", handlePumpBeansOff);
  server.on("/api/pump/yam/on", handlePumpYamOn);
  server.on("/api/pump/yam/off", handlePumpYamOff);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("🌐 Local HTTP server started on port 80 (LAN only, no internet required).");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("      SOILGUARD LOCAL-NETWORK-ONLY MODE          ");
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

  // Join the local Wi-Fi router (no internet access needed on that router)
  setupWiFi();

  // Start serving sensor data + pump control over the LAN
  setupLocalServer();

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

  // 2. Serve any pending local HTTP requests (sensor reads / pump commands)
  server.handleClient();

  // --- READ DHT11 AIR TEMP/HUMIDITY (real values from pin 32) ---
  // DHT11's max sample rate is ~1Hz, so read on a 2s cadence rather than every
  // loop. A failed read (NaN) leaves the last good value untouched and is
  // flagged via dhtOk so the telemetry block can report it -- we never
  // substitute a fabricated number for a real reading.
  if (currentTime - lastDhtReadTime >= dhtReadInterval) {
    lastDhtReadTime = currentTime;
    float newTemp = dht.readTemperature();
    float newHumid = dht.readHumidity();
    dhtOk = !isnan(newTemp) && !isnan(newHumid);
    if (dhtOk) {
      airTemp = newTemp;
      airHumid = newHumid;
    }
  }

  // --- READ AND CALIBRATE ALL SENSORS ---
  int rawRice = analogRead(MOISTURE_RICE);
  moistureRice = constrain(map(rawRice, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);

  int rawBeans = analogRead(MOISTURE_BEANS);
  moistureBeans = constrain(map(rawBeans, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);

  int rawYam = analogRead(MOISTURE_YAM);
  moistureYam = constrain(map(rawYam, DRY_VALUE, WET_VALUE, 0, 100), 0, 100);

  // --- READ SOLAR PANEL VOLTAGE (system-wide, GPIO 35) ---
  // Read the raw analog value (0 to 4095 for ESP32's 12-bit ADC)
  int rawValue = analogRead(SOLAR_PIN);
  float vOut = (rawValue * SOLAR_V_REF) / 4095.0;
  solarVoltage = vOut * SOLAR_DIVIDER_RATIO;  // assign to global (used by buildSensorJson)

  // --- TIMED LOCAL TERMINAL REPORTING BLOCK ---
  if (currentTime - lastTelemetryTime >= telemetryInterval) {
    lastTelemetryTime = currentTime;

    Serial.println("📊 --- LOCAL MONITOR REPORT ---");
    if (!isnan(airTemp) && !isnan(airHumid)) {
      Serial.print("  [ENV] Temp: "); Serial.print(airTemp, 1); Serial.print("°C | Humid: "); Serial.print(airHumid, 1); Serial.print("%");
      Serial.println(dhtOk ? "" : "  (⚠ latest DHT11 read failed -- showing last good value)");
    } else {
      Serial.print("  [ENV] ⚠ DHT11 NOT RESPONDING on pin "); Serial.print(DHTPIN); Serial.println(" -- no real reading yet. Check the data wire + a 10k pull-up to 3.3V.");
    }
    Serial.print("  [RICE]  Moisture: "); Serial.print(moistureRice, 0); Serial.print("% | Pump: "); Serial.println(isRicePumpRunning ? "ON" : "OFF");
    Serial.print("  [BEANS] Moisture: "); Serial.print(moistureBeans, 0); Serial.print("% | Pump: "); Serial.println(isBeansPumpRunning ? "ON" : "OFF");
    Serial.print("  [YAM]   Moisture: "); Serial.print(moistureYam, 0); Serial.print("% | Pump: "); Serial.println(isYamPumpRunning ? "ON" : "OFF");
    Serial.print("  [SOLAR] "); Serial.print(solarVoltage, 2); Serial.print("V -> "); Serial.println(solarVoltage > 6.0 ? "CHARGING" : "not charging");

    // -----------------------------------------------------------------
    // CLOUD (FIREBASE / INTERNET) UPLOAD -- DISABLED FOR LOCAL-ONLY MODE
    // Kept commented out (not deleted) so it can be switched back on later.
    // Sensor data is now served on-demand via the local HTTP server above
    // (see /api/sensor, /api/sensor/rice, /api/sensor/beans, /api/sensor/yam).
    // -----------------------------------------------------------------
    // if (WiFi.status() == WL_CONNECTED) {
    //   sendDataToBackend("rice", airTemp, airHumid, moistureRice, isRicePumpRunning);
    //   sendDataToBackend("beans", airTemp, airHumid, moistureBeans, isBeansPumpRunning);
    // } else {
    //   Serial.println("📡 Network Offline -> Skipping cloud telemetry transmission.");
    // }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("📡 Local server reachable at http://"); Serial.println(WiFi.localIP());
    } else {
      Serial.println("📡 Local network offline -> waiting to reconnect to router...");
    }
    Serial.println("--------------------------------------------------");
  }

  // =========================================================================
  // 3. SERIAL COMMAND LISTENERS (Exclusive Pump Trigger Hub)
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
