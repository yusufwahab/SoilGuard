// #ifndef API_WIFI_H
// #define API_WIFI_H

// #include <Arduino.h>

// // Initialize Wi-Fi connection at boot with a 10-second timeout safety net
// void setupWiFi();

// // Non-blocking watchdog that runs inside the loop to monitor and restore connection automatically
// void maintainWiFiConnection();

// // Push localized data payloads directly to Firebase RTDB endpoints via HTTP PUT
// void sendDataToBackend(const char* crop, float temp, float humid, float moisture, float ph, float ec, bool pumpOn);

// // Listen for remote dashboard triggers and dynamically sync target moisture thresholds via HTTP GET
// void checkPumpCommand(const char* crop, int relayPin, bool &pumpRunningState, unsigned long &pumpStartTime, float &targetMoisture);

// #endif