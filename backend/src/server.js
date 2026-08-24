import "dotenv/config"; // MUST be the first import -- loads .env before
                         // any other module (aiProviders, supabaseAdmin)
                         // reads process.env at import time.

import express from "express";
import cors from "cors";
import { startScheduler } from "./scheduler.js";
import { analyzeAllCrops, analyzeCrop } from "./analyze.js";

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

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`[Server] SoilGuard backend listening on port ${port}`);
  startScheduler();
});
