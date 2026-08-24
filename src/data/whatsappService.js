// -----------------------------------------------------------------------
// WHATSAPP ALERTS (via CallMeBot) -- INTERNET REQUIRED, AND THAT'S FINE.
// This is deliberately kept OUT of the ESP32 firmware and out of the
// local-only sensor data path -- the ESP32 stays fully offline-capable.
// This module runs in the browser/dashboard layer, which is allowed to
// use the internet for non-control features (alerts, AI dashboard, etc.)
// even while the hardware itself never needs it.
//
// Setup (one-time, on your own phone):
//   1. Save +34 644 59 71 67 as a contact in your phone.
//   2. From YOUR WhatsApp, message it: "I allow callmebot to send me messages"
//   3. It replies with your personal API key.
//   4. Put your number + that key in .env (see .env.example) as
//      VITE_WHATSAPP_PHONE / VITE_WHATSAPP_APIKEY. Never commit .env.
// -----------------------------------------------------------------------

const PHONE  = import.meta.env.VITE_WHATSAPP_PHONE;
const APIKEY = import.meta.env.VITE_WHATSAPP_APIKEY;

const COOLDOWN_STORAGE_KEY = "soilguard_whatsapp_cooldowns";
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per alert key

export function isWhatsAppConfigured() {
  return Boolean(PHONE && APIKEY);
}

function readCooldowns() {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeCooldowns(map) {
  try {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable -- cooldowns just won't persist across reloads
  }
}

// Send a WhatsApp message to your own number via CallMeBot, but only if
// this exact alert `key` hasn't already fired within `cooldownMs`. This is
// what keeps a flapping sensor or a genuinely offline device from spamming
// your phone every poll cycle (every 3s otherwise).
export async function sendAlertOnce(key, message, cooldownMs = DEFAULT_COOLDOWN_MS) {
  if (!isWhatsAppConfigured()) return;

  const cooldowns = readCooldowns();
  const last = cooldowns[key] || 0;
  if (Date.now() - last < cooldownMs) return; // still cooling down, skip

  cooldowns[key] = Date.now();
  writeCooldowns(cooldowns);

  const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE}&text=${encodeURIComponent(message)}&apikey=${APIKEY}`;
  try {
    // mode: "no-cors" -- CallMeBot doesn't send CORS headers back, so the
    // browser blocks us from reading the response, but the request still
    // reaches their server and the WhatsApp message still sends. We're
    // firing this and forgetting it, not depending on the reply.
    await fetch(url, { mode: "no-cors" });
  } catch (err) {
    console.error("[WhatsApp] Failed to send alert:", err.message);
  }
}
