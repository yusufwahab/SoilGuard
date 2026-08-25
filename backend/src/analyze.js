import { supabaseAdmin } from "./supabaseAdmin.js";
import { getAIAnalysis } from "./aiProviders.js";
import { fetchWeatherSummary } from "./weatherService.js";

const CROPS = ["rice", "beans", "yam"];
const CROP_LABELS = { rice: "Rice Paddy", beans: "Beans Field", yam: "Yam Plot" };
const DECISIONS = new Set(["IRRIGATE", "POSTPONE", "MONITOR", "ALERT"]);

function minOf(arr) { return arr.length ? Math.min(...arr) : null; }
function maxOf(arr) { return arr.length ? Math.max(...arr) : null; }
function avgOf(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function round(v, d = 1) { return v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d; }

// Reduces a batch of raw readings (newest-first) into the compact stats
// blob the prompt is built from.
function summarize(readings) {
  const nums = (key) => readings.map((r) => r[key]).filter((v) => typeof v === "number");
  const moisture = nums("moisture");
  const temperature = nums("temperature");
  const humidity = nums("humidity");
  const pumpOnCount = readings.filter((r) => r.pump_status).length;
  const latest = readings[0];

  return {
    sampleCount: readings.length,
    latest: {
      moisture: latest.moisture,
      temperature: latest.temperature,
      humidity: latest.humidity,
      pumpOn: Boolean(latest.pump_status),
      recordedAt: latest.recorded_at,
    },
    moisture:    { avg: round(avgOf(moisture)),    min: round(minOf(moisture)),    max: round(maxOf(moisture)) },
    temperature: { avg: round(avgOf(temperature)), min: round(minOf(temperature)), max: round(maxOf(temperature)) },
    humidity:    { avg: round(avgOf(humidity)),    min: round(minOf(humidity)),    max: round(maxOf(humidity)) },
    pumpOnFraction: round(pumpOnCount / readings.length, 2),
  };
}

function formatWeatherSection(weather) {
  if (!weather) {
    return "\nWeather data is not available for this analysis -- base your decision on sensor trends alone.";
  }
  const { current, next24h } = weather;
  return `
Current weather at the farm: ${current.temperature}C, ${current.humidity}% humidity, ${current.cloudCoverPct}% cloud cover, ${current.precipitationMm}mm/h precipitation right now.
Next 24h forecast: up to ${next24h.maxRainChancePct}% chance of rain, ~${next24h.totalExpectedRainMm}mm total expected precipitation, temperature range ${next24h.tempMin}-${next24h.tempMax}C.
Factor this into your decision: prefer POSTPONE over IRRIGATE if meaningful rain is expected soon even when soil is on the dry side (let nature do the watering); prefer ALERT if a heat spike is coming with little/no rain and soil is already dry; mention the weather reasoning in farmer_message when it changes your call.`;
}

function buildPrompt(cropKey, stats, weather) {
  const label = CROP_LABELS[cropKey] ?? cropKey;
  const lookback = process.env.ANALYSIS_LOOKBACK_MINUTES || 60;

  return `You are an agricultural monitoring AI for a smart irrigation system called SoilGuard, analyzing one soil sensor node.

Crop: ${label} (${cropKey})
Sensor summary over the last ${lookback} minutes (${stats.sampleCount} readings):
- Latest reading: moisture ${stats.latest.moisture}%, temperature ${stats.latest.temperature}C, humidity ${stats.latest.humidity}%, pump ${stats.latest.pumpOn ? "ON" : "OFF"}
- Moisture: avg ${stats.moisture.avg}%, range ${stats.moisture.min}-${stats.moisture.max}%
- Temperature: avg ${stats.temperature.avg}C, range ${stats.temperature.min}-${stats.temperature.max}C
- Humidity: avg ${stats.humidity.avg}%, range ${stats.humidity.min}-${stats.humidity.max}%
- Pump was ON for ${Math.round(stats.pumpOnFraction * 100)}% of readings in this window
${formatWeatherSection(weather)}

Note: this node only has soil moisture, air temperature, and air humidity sensors -- no pH or EC probe. Base corrosion/fungi reasoning on sustained moisture + warmth + humidity trends (that combination drives both corrosion of buried metal parts and fungal/disease risk), not on chemistry you don't have data for.

Respond with ONLY a single valid JSON object -- no markdown code fences, no commentary before or after -- with EXACTLY these fields:
{
  "farmer_message": string (1-3 plain-language sentences of practical advice for a farmer, in English),
  "farmer_message_ha": string (the SAME advice as farmer_message, translated into natural Hausa -- not transliterated English, actual Hausa words a Hausa speaker would use. This gets read aloud by a text-to-speech voice for farmers who may not read English, so it must be real, grammatical Hausa, not a literal word-for-word translation that would sound unnatural),
  "recommended_target": number (recommended target soil moisture percentage, 0-100),
  "fungi_risk_score": number (0-10, fungal/disease risk),
  "fungi_advice": string (short actionable advice),
  "material_health_status": string (start with "OK:", "Warning:", or "Critical:" then a brief reason),
  "decision": one of "IRRIGATE" | "POSTPONE" | "MONITOR" | "ALERT",
  "corrosion_risk_score": number (0-10, estimated risk to buried metal components),
  "sensor_health_pct": number (0-100, estimated sensor/probe health)
}`;
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// The AI response is free-form JSON from three different providers --
// never trust it directly. Coerce every field to the type/range the
// frontend expects, falling back to a safe default per-field.
function validateAnalysis(data) {
  return {
    farmer_message:         typeof data.farmer_message === "string" ? data.farmer_message.slice(0, 1000) : "No analysis available.",
    farmer_message_ha:      typeof data.farmer_message_ha === "string" ? data.farmer_message_ha.slice(0, 1000) : "",
    recommended_target:     clamp(data.recommended_target, 0, 100, 50),
    fungi_risk_score:       clamp(data.fungi_risk_score, 0, 10, 0),
    fungi_advice:           typeof data.fungi_advice === "string" ? data.fungi_advice.slice(0, 500) : "",
    material_health_status: typeof data.material_health_status === "string" ? data.material_health_status.slice(0, 500) : "OK: No issues detected.",
    decision:                DECISIONS.has(data.decision) ? data.decision : "MONITOR",
    corrosion_risk_score:   clamp(data.corrosion_risk_score, 0, 10, 0),
    sensor_health_pct:      clamp(data.sensor_health_pct, 0, 100, 100),
  };
}

// Analyzes one crop: pulls its recent sensor_readings, asks the AI chain
// for an assessment, validates the shape, and upserts into ai_dashboard.
export async function analyzeCrop(cropKey) {
  const lookbackMin = Number(process.env.ANALYSIS_LOOKBACK_MINUTES || 60);
  const since = new Date(Date.now() - lookbackMin * 60_000).toISOString();

  const { data: readings, error } = await supabaseAdmin
    .from("sensor_readings")
    .select("moisture, temperature, humidity, pump_status, recorded_at")
    .eq("crop_key", cropKey)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Supabase read failed for ${cropKey}: ${error.message}`);
  if (!readings || readings.length === 0) {
    console.warn(`[Analyze] No recent sensor_readings for ${cropKey} -- skipping (device likely offline, or the frontend hasn't logged any yet).`);
    return { skipped: true, reason: "no recent readings" };
  }

  const stats = summarize(readings);

  // Weather is context, never a hard dependency -- an outage here should
  // never block a sensor-based analysis from running.
  const weather = await fetchWeatherSummary().catch((err) => {
    console.warn(`[Analyze] Weather fetch failed, proceeding without it: ${err.message}`);
    return null;
  });

  const prompt = buildPrompt(cropKey, stats, weather);
  const { provider, data } = await getAIAnalysis(prompt);
  const validated = validateAnalysis(data);

  const { error: upsertError } = await supabaseAdmin.from("ai_dashboard").upsert({
    crop_key: cropKey,
    ...validated,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) throw new Error(`Supabase write failed for ${cropKey}: ${upsertError.message}`);

  console.log(`[Analyze] ${cropKey}: wrote AI dashboard via ${provider}.`);
  return { skipped: false, provider, data: validated };
}

export async function analyzeAllCrops() {
  const results = {};
  for (const cropKey of CROPS) {
    try {
      results[cropKey] = await analyzeCrop(cropKey);
    } catch (err) {
      console.error(`[Analyze] ${cropKey} failed:`, err.message);
      results[cropKey] = { skipped: true, error: err.message };
    }
  }
  return results;
}
