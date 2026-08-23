#ifndef API_WIFI_H
#define API_WIFI_H

#include <Arduino.h>

// Initialize Wi-Fi connection at boot with a 10-second timeout safety net.
// Joins a LOCAL router/hotspot -- that router does NOT need internet access,
// it just needs to be the same network your phone/laptop is on.
void setupWiFi();

// Non-blocking watchdog that runs inside the loop to monitor and restore connection automatically
void maintainWiFiConnection();

// -----------------------------------------------------------------------
// CLOUD (FIREBASE / INTERNET) SYNC -- DISABLED FOR LOCAL-ONLY MODE
// Left here commented out so it can be re-enabled later if internet
// connectivity is ever wanted again. See api_wifi.cpp for the implementation.
// -----------------------------------------------------------------------
// void sendDataToBackend(const char* crop, float temp, float humid, float moisture, bool pumpOn);

#endif