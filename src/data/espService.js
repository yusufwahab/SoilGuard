// -----------------------------------------------------------------------
// LOCAL ESP32 SERVICE
// Talks directly to the SoilGuard ESP32's local HTTP server over the LAN
// (see esp-code/Soilguard-Hardware/src/main.cpp). No internet / Firebase
// involved -- these are real-time readings straight from the hardware.
// -----------------------------------------------------------------------

// TODO: set this to your ESP32's local IP, printed to Serial after it
// connects to Wi-Fi (e.g. "📶 Local IP Address: 192.168.1.42").
export const ESP_IP = "192.168.1.42";

const ESP_BASE_URL = `http://${ESP_IP}`;

const CROPS = ["rice", "beans", "yam"];

// Fetch the latest {temperature, humidity, moisture, pumpStatus} for all
// three crops in one request -> { rice: {...}, beans: {...}, yam: {...} }
export async function fetchAllSensors() {
  const res = await fetch(`${ESP_BASE_URL}/api/sensor`);
  if (!res.ok) throw new Error(`ESP32 responded ${res.status}`);
  return res.json();
}

// Turn a crop's pump ON or OFF directly on the ESP32 (state: "ON" | "OFF")
export async function setPumpOnESP(crop, state) {
  if (!CROPS.includes(crop)) throw new Error(`Unknown crop: ${crop}`);
  const path = state === "ON" ? "on" : "off";
  const res = await fetch(`${ESP_BASE_URL}/api/pump/${crop}/${path}`);
  if (!res.ok) throw new Error(`ESP32 responded ${res.status}`);
  return res.json();
}
