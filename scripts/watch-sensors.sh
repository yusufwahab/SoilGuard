#!/usr/bin/env bash
# Watch live SoilGuard ESP32 sensor readings directly from the terminal.
# Polls the ESP32's local HTTP server (no Firebase, no internet) every 3s
# and reprints the latest values -- proof the numbers are coming straight
# from the hardware, not a cached/mock value.
#
# Usage:
#   ./scripts/watch-sensors.sh 192.168.1.55
#
# Find the IP from the ESP32's Serial Monitor line:
#   "📶 Local IP Address: ..."

ESP_IP="${1:-192.168.1.42}"

echo "Watching SoilGuard ESP32 at http://$ESP_IP (Ctrl+C to stop)"
echo

while true; do
  response=$(curl -s -m 5 "http://$ESP_IP/api/sensor")
  clear
  echo "SoilGuard Live Readings -- $(date +%T)"
  echo
  if [ -z "$response" ]; then
    echo "Can't reach ESP32 at $ESP_IP -- check it's powered on and you're on the same Wi-Fi."
  elif command -v jq >/dev/null 2>&1; then
    echo "$response" | jq -r '
      to_entries[] |
      "\(.key | ascii_upcase)  Temp: \(.value.temperature)C  Humidity: \(.value.humidity)%  Moisture: \(.value.moisture)%  Pump: \(if .value.pumpStatus == 1 then "ON" else "OFF" end)"
    '
  else
    echo "$response"
  fi
  sleep 3
done
