// -----------------------------------------------------------------------
// BROWSER NOTIFICATIONS -- native OS-level popups via the Notification
// API, so a hardware-disconnect alert reaches the farmer even if the
// SoilGuard tab isn't focused or is minimized. This is an ADDITIONAL
// channel alongside Telegram (see telegramService.js) and the in-app
// alert badges/pages -- not a replacement for either. Fires at the exact
// same trigger points as the Telegram message (see SensorContext.jsx),
// so it's the same real signal, just a second delivery path.
//
// Silently does nothing if the browser doesn't support Notification, or
// the user hasn't granted permission -- never throws, never blocks the
// poll loop that calls it.
// -----------------------------------------------------------------------

let permissionRequested = false;

// Call once, early (SensorProvider does this on mount). Only actually
// prompts the user the first time -- browsers remember "default" (not yet
// asked) vs "granted"/"denied" across reloads, so this is a no-op after
// the first grant/deny.
export function ensureNotificationPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") return; // unsupported browser/SSR
  if (permissionRequested) return;
  permissionRequested = true;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // Some browsers reject instead of resolving "denied" -- either way,
      // just means no browser notifications this session.
    });
  }
}

// tag: notifications sharing a tag replace each other instead of stacking
// (used so "device offline" -> "device back online" replaces, not piles up).
export function sendBrowserNotification(title, body, { tag } = {}) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag, icon: "/favicon.svg" });
    return true;
  } catch (err) {
    console.error("[Notification] Failed to show browser notification:", err.message);
    return false;
  }
}
