// -----------------------------------------------------------------------
// ALERTS (via the Telegram Bot API)
// Runs server-side ONLY -- the bot token is a credential that shouldn't
// reach a browser. The frontend calls this backend's POST /api/alert
// instead of talking to Telegram directly.
//
// This replaced two earlier attempts (see git history for both):
//   - CallMeBot (WhatsApp) -- simple, client-side only, but an unofficial
//     bridge with no published security docs and unreliable delivery.
//   - Meta WhatsApp Cloud API -- official, but moved to per-message
//     pricing with no free monthly tier as of July 2025.
// Telegram's Bot API is free (no per-message pricing, ever), official,
// and doesn't need a message-template approval step for unprompted alerts.
//
// Setup (see backend/README.md for the full walkthrough):
//   1. Message @BotFather on Telegram, send /newbot, follow the prompts.
//      It gives you a bot token -> TELEGRAM_BOT_TOKEN.
//   2. Message your new bot anything (e.g. "hi") so it can see you --
//      Telegram requires this one-time step before a bot can message you.
//   3. Visit https://api.telegram.org/bot<token>/getUpdates in a browser
//      and find your numeric chat id in the response -> TELEGRAM_CHAT_ID.
// -----------------------------------------------------------------------

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

export function isTelegramConfigured() {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

export async function sendTelegramAlert(message) {
  if (!isTelegramConfigured()) {
    throw new Error(
      "Telegram not configured -- set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in backend/.env"
    );
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const errMsg = data?.description || `HTTP ${res.status}`;
    throw new Error(`Telegram send failed: ${errMsg}`);
  }
  return data;
}
