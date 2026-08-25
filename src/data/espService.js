// -----------------------------------------------------------------------
// LOCAL ESP32 SERVICE
// Talks directly to the SoilGuard ESP32's local HTTP server over the LAN
// (see esp-code/Soilguard-Hardware/src/main.cpp). No internet / Firebase
// involved -- these are real-time readings straight from the hardware.
// -----------------------------------------------------------------------

// TODO: set this to your ESP32's local IP, printed to Serial after it
// connects to Wi-Fi (e.g. "📶 Local IP Address: 192.168.1.42").
export const ESP_IP = "10.201.69.233";

const ESP_BASE_URL = `http://${ESP_IP}`;

const CROPS = ["rice", "beans", "yam"];

// A genuinely unreachable LAN device (unplugged, powered off, wrong Wi-Fi)
// doesn't always make fetch() reject quickly -- with no server there to
// send back a TCP reset, a browser can sit waiting on the connection for a
// long time (tens of seconds, sometimes effectively indefinitely) before
// giving up on its own. SensorContext.jsx polls every 3s and only raises
// the "device disconnected" alert after 3 consecutive failures (~9s) --
// that logic silently never fires if the request itself never settles.
// A hard timeout makes every poll fail fast and predictably instead.
const REQUEST_TIMEOUT_MS = 2500;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`ESP32 did not respond within ${REQUEST_TIMEOUT_MS}ms`, { cause: err });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch the latest {temperature, humidity, moisture, pumpStatus} for all
// three crops in one request -> { rice: {...}, beans: {...}, yam: {...} }
export async function fetchAllSensors() {
  const res = await fetchWithTimeout(`${ESP_BASE_URL}/api/sensor`);
  if (!res.ok) throw new Error(`ESP32 responded ${res.status}`);
  return res.json();
}

// Turn a crop's pump ON or OFF directly on the ESP32 (state: "ON" | "OFF")
export async function setPumpOnESP(crop, state) {
  if (!CROPS.includes(crop)) throw new Error(`Unknown crop: ${crop}`);
  const path = state === "ON" ? "on" : "off";
  const res = await fetchWithTimeout(`${ESP_BASE_URL}/api/pump/${crop}/${path}`);
  if (!res.ok) throw new Error(`ESP32 responded ${res.status}`);
  return res.json();
}
