#ifndef API_WIFI_H
#define API_WIFI_H

#include <Arduino.h>

// Initialize Wi-Fi connection at boot with a 10-second timeout safety net
void setupWiFi();

// Non-blocking watchdog that runs inside the loop to monitor and restore connection automatically
void maintainWiFiConnection();

// Push localized data payloads directly to Firebase RTDB endpoints via HTTP PUT
void sendDataToBackend(const char* crop, float temp, float humid, float moisture, bool pumpOn);

#endif