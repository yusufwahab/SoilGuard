// -----------------------------------------------------------------------
// ALERTS -- routed through backend/ (the Telegram bot token is a
// credential that shouldn't reach the browser). This file only decides
// WHEN to alert (trigger + cooldown logic) and asks the backend to
// actually send it via POST /api/alert. See backend/src/telegramService.js
// + backend/README.md for the send side and setup walkthrough.
//
// (Earlier attempts, in git history: CallMeBot -- unofficial WhatsApp
// bridge, unreliable; Meta WhatsApp Cloud API -- official but moved to
// per-message pricing with no free tier. Telegram's Bot API is free and
// official, which is why it's what's wired up now.)
// -----------------------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8787";

const COOLDOWN_STORAGE_KEY = "soilguard_alert_cooldowns";
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per alert key

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

// Asks the backend to send an alert, but only if this exact alert `key`
// hasn't already fired within `cooldownMs`. This is what keeps a flapping
// sensor or a genuinely offline device from spamming you every poll cycle
// (every 3s otherwise).
export async function sendAlertOnce(key, message, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const cooldowns = readCooldowns();
  const last = cooldowns[key] || 0;
  if (Date.now() - last < cooldownMs) return; // still cooling down, skip

  cooldowns[key] = Date.now();
  writeCooldowns(cooldowns);

  try {
    const res = await fetch(`${BACKEND_URL}/api/alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[Alert] Backend rejected alert:", data.error || res.status);
    }
  } catch (err) {
    // Backend unreachable (not running, or no internet) -- fail silently
    // from the UI's perspective, same as any other best-effort alert.
    console.error("[Alert] Couldn't reach backend to send alert:", err.message);
  }
}
