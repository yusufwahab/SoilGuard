import "dotenv/config"; // MUST be the first import -- loads .env before
                         // any other module (aiProviders, supabaseAdmin)
                         // reads process.env at import time.

import express from "express";
import cors from "cors";
import { startScheduler } from "./scheduler.js";
import { analyzeAllCrops, analyzeCrop } from "./analyze.js";
import { sendTelegramAlert } from "./telegramService.js";
import { synthesizeHausa } from "./ttsService.js";

const app = express();
app.use(cors());
app.use(express.json());

const VALID_CROPS = ["rice", "beans", "yam"];

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "soilguard-backend" });
});

// Manual trigger for all crops -- handy for testing without waiting for
// the schedule (e.g. curl -X POST http://localhost:8787/api/analyze).
app.post("/api/analyze", async (req, res) => {
  try {
    const results = await analyzeAllCrops();
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Manual trigger for a single crop.
app.post("/api/analyze/:crop", async (req, res) => {
  const { crop } = req.params;
  if (!VALID_CROPS.includes(crop)) {
    return res.status(400).json({ ok: false, error: `Unknown crop "${crop}"` });
  }
  try {
    const result = await analyzeCrop(crop);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Sends an alert via the Telegram Bot API (see telegramService.js). The
// frontend calls this instead of holding the bot token itself. Trigger/
// cooldown logic still lives in the frontend (src/data/telegramService.js);
// this endpoint only does the actual send.
app.post("/api/alert", async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ ok: false, error: "Missing 'message' string in request body" });
  }
  try {
    await sendTelegramAlert(message);
    res.json({ ok: true });
  } catch (err) {
    console.error("[Telegram] Send failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Reads a piece of AI-generated text aloud in Hausa (see ttsService.js) --
// for farmers who may not read confidently. Runs the ElevenLabs call
// on-demand per request; the API key stays server-side, same reasoning
// as /api/alert. Expects `text` to already BE Hausa (see analyze.js's
// farmer_message_ha) -- TTS doesn't translate, it only pronounces
// whatever text it's given.
app.post("/api/tts", async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ ok: false, error: "Missing 'text' string in request body" });
  }
  try {
    const audio = await synthesizeHausa(text);
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    console.error("[TTS] Synthesis failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`[Server] SoilGuard backend listening on port ${port}`);
  startScheduler();
});
