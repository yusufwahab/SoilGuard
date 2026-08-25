# SoilGuard Backend

Replaces the old n8n workflow. On a schedule (default every 30 min), reads
each crop's recent sensor history from Supabase, pulls current + forecast
weather for the farm (via Open-Meteo -- free, no API key), asks an AI
provider chain (**Gemini -> Groq -> Claude**, first success wins) for an
analysis, and writes the result into Supabase's `ai_dashboard` table for
the frontend to display.

This backend **never talks to the ESP32** -- it only reads `sensor_readings`
rows that the frontend already logs to Supabase as it polls the ESP32 over
the LAN (see `../src/data/SensorContext.jsx`). The ESP32 stays fully
local-only, same as always.

## Setup

1. Run `../supabase/schema.sql` in your Supabase project's SQL editor (once
   -- or re-run it if you set this up before `farm_settings` was added; it's
   safe to re-run, `create table if not exists` won't touch existing data).
2. `cp .env.example .env` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` -- Project Settings -> API
     in Supabase. **Service role key, not anon** -- it bypasses RLS and must
     never be exposed to a browser.
   - `GEMINI_API_KEY` -- from [Google AI Studio](https://aistudio.google.com/apikey). Required to start.
   - `GROQ_API_KEY` -- from [console.groq.com](https://console.groq.com/keys). Optional, used only if Gemini fails.
   - `ANTHROPIC_API_KEY` -- from [console.anthropic.com](https://console.anthropic.com). Optional, used only if both Gemini and Groq fail.
   - `FARM_LATITUDE` / `FARM_LONGITUDE` -- **not the primary way to set this.** The farmer sets their own farm's location in the app's Settings page (Fields & Devices tab, types a place name like "Minna, Niger State" -- geocoded client-side via Open-Meteo, saved to Supabase). These two vars are only a fallback for before that's set.
   - `TELEGRAM_*` -- see [Alerts setup](#alerts-setup) below. Optional -- leave blank to skip alerting entirely.
3. `npm install`
4. `npm start` (or `npm run dev` to auto-restart on file changes)

Health check: `GET http://localhost:8787/`

## Manually triggering an analysis

Don't want to wait for the schedule? Trigger it directly:

```bash
curl -X POST http://localhost:8787/api/analyze          # all 3 crops
curl -X POST http://localhost:8787/api/analyze/rice      # one crop
```

## How it decides what to say

`src/analyze.js` pulls the last `ANALYSIS_LOOKBACK_MINUTES` (default 60) of
`sensor_readings` for a crop, reduces them to averages/min/max, adds current
+ 24h-forecast weather for the farm (`src/weatherService.js` -- location
read from Supabase's `farm_settings`, cached 5 min; weather itself cached
15 min so a scheduled run doesn't refetch it 3x), and prompts the AI for a
strict-JSON response matching the `ai_dashboard` schema
(`farmer_message`, `recommended_target`, `fungi_risk_score`,
`corrosion_risk_score`, `decision`, etc.). Every field is clamped/validated
before writing -- a malformed or out-of-range AI response never reaches the
database as-is.

If a crop has no `sensor_readings` in the lookback window (ESP32 offline, or
the frontend hasn't polled it yet), that crop is skipped for that run rather
than sending a prompt with no real data.

## Alerts setup

The frontend decides *when* to alert (rapid sensor swings, device going
offline/online -- see `../src/data/SensorContext.jsx`); this backend does
the actual sending, via the **Telegram Bot API**. Free, official, no
per-message pricing, and no message-template approval step needed for
unprompted alerts (unlike WhatsApp's official API, which is also why
that path -- and the CallMeBot workaround before it -- got replaced with
this instead; see git history for both).

1. Open Telegram, search for **@BotFather**, and message it `/newbot`. Follow the prompts (pick a name, then a username ending in "bot"). It replies with a **bot token** -> `TELEGRAM_BOT_TOKEN`.
2. Search for your new bot by its username and message it anything (e.g. "hi") -- Telegram requires the user to message a bot first before that bot can message them back. This is a one-time step, not per-alert.
3. In your browser, visit `https://api.telegram.org/bot<token>/getUpdates` (swap in your real token). Find `"chat":{"id":...}` in the JSON response -- that number is your `TELEGRAM_CHAT_ID`.
4. Paste both values into `.env` and restart the server.

Test it directly without waiting for a real trigger:
```bash
curl -X POST http://localhost:8787/api/alert -H "Content-Type: application/json" -d "{\"message\":\"Test alert from SoilGuard backend\"}"
```

## Deploying to Render

`render.yaml` is a ready-to-use Blueprint. In the Render dashboard: **New +
-> Blueprint**, point it at this repo, set root directory to `backend`. Fill
in the `sync: false` env vars (the secrets) after the first deploy -- never
commit them. The scheduler runs inside the same always-on web process, so no
separate cron job/service is needed.
