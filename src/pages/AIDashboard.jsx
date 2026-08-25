import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useAIDashboard, useCropControls, useSensorData, useDemoStatus } from "../data/SensorContext";
import { fetchHausaAudio } from "../data/ttsService";
import Card from "../components/ui/Card";

// Real farm photography (supplied by the user) -- replaces every stock
// Unsplash placeholder that stood in for these during earlier drafts.
import soilWaterPhoto from "../assets/dashboard/01_soil_water_seedling.png";
import cropHealthPhoto from "../assets/dashboard/02_crop_health_leaves.png";
import soilConditionPhoto from "../assets/dashboard/03_soil_condition.png";
import sensorStatusPhoto from "../assets/dashboard/04_sensor_status.png";
import irrigationPumpPhoto from "../assets/dashboard/05_irrigation_pump.png";
import farmFieldsMapPhoto from "../assets/dashboard/06_farm_fields_map.png";
import soilDryPhoto from "../assets/dashboard/07_soil_moisture_dry.png";
import soilOkayPhoto from "../assets/dashboard/08_soil_moisture_okay.png";
import soilWetPhoto from "../assets/dashboard/09_soil_moisture_wet.png";
import farmRowsPhoto from "../assets/dashboard/Rice_Field.webp";

/* ─── Crop / zone config -- real crops, shown as "Zone N" per the design
   reference, but driven by real node data, not placeholder text. ────── */
const CROP_META = {
  rice:  { label: "Rice",  zoneLabel: "Zone 1", id: "SG-RICE" },
  beans: { label: "Beans", zoneLabel: "Zone 2", id: "SG-BEANS" },
  yam:   { label: "Yam",   zoneLabel: "Zone 3", id: "SG-YAM" },
};
const CROP_KEYS = Object.keys(CROP_META);

const TONE_STYLES = {
  good:    { pill: "bg-semantic-green text-white", text: "text-semantic-green" },
  warn:    { pill: "bg-semantic-amber text-white", text: "text-semantic-amber" },
  bad:     { pill: "bg-semantic-red text-white",   text: "text-semantic-red" },
  neutral: { pill: "bg-surface-300 text-surface-700", text: "text-surface-500" },
};

/* ─── Plain-language classifiers -- translate real numbers/AI output into
   the kind of everyday wording a non-technical farmer reads at a glance.
   Kept separate from the AI's own English message (still shown/read
   verbatim in the advice card) -- these are just the small status tiles. */
function classifyMoisture(moisture) {
  if (moisture == null) return { label: "NO READING", sub: "Waiting for sensor", tone: "neutral" };
  if (moisture < 30) return { label: "NEEDS WATER", sub: "Soil is dry", tone: "bad" };
  if (moisture > 80) return { label: "TOO WET", sub: "Too much water", tone: "warn" };
  return { label: "ENOUGH WATER", sub: "Soil is moist", tone: "good" };
}

function classifyCropHealth(aiData) {
  if (!aiData) return { label: "CHECKING", sub: "Waiting for update", tone: "neutral" };
  const risk = aiData.fungi_risk_score ?? 0;
  if (aiData.decision === "ALERT" || risk >= 7) return { label: "AT RISK", sub: "Needs checking", tone: "bad" };
  if (risk >= 4) return { label: "WATCH", sub: "Keep an eye on it", tone: "warn" };
  return { label: "HEALTHY", sub: "Crops look good", tone: "good" };
}

function classifySoilCondition(aiData) {
  if (!aiData) return { label: "CHECKING", sub: "Waiting for update", tone: "neutral" };
  const status = (aiData.material_health_status || "").toLowerCase();
  if (status.startsWith("critical")) return { label: "CRITICAL", sub: "Needs attention", tone: "bad" };
  if (status.startsWith("warning")) return { label: "WARNING", sub: "Keep watching", tone: "warn" };
  return { label: "GOOD", sub: "No problems found", tone: "good" };
}

function classifySensorStatus(node) {
  if (!node) return { label: "NO DEVICE", sub: "Not set up yet", tone: "neutral" };
  if (node.connectivity === "live") return { label: "WORKING WELL", sub: "Sensor is active", tone: "good" };
  if (node.connectivity === "demo") return { label: "DEMO DATA", sub: "Showing sample data", tone: "warn" };
  return { label: "OFFLINE", sub: "Device disconnected", tone: "bad" };
}

// Worst-of the tiles above, used for the per-zone pill and the farm-wide headline.
const TONE_RANK = { bad: 3, warn: 2, neutral: 1, good: 0 };
function worstTone(...tones) {
  return tones.reduce((worst, t) => (TONE_RANK[t] > TONE_RANK[worst] ? t : worst), "good");
}

/* ─── Small building blocks ───────────────────────────────────────── */
function StatusPill({ label, tone }) {
  return (
    <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${TONE_STYLES[tone].pill}`}>
      {label}
    </span>
  );
}

function StatTile({ label, image, status }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 px-3 pt-3">{label}</p>
      <div className="px-3 pt-2 pb-3">
        <div className="h-20 rounded-lg overflow-hidden mb-2">
          <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <StatusPill label={status.label} tone={status.tone} />
        <p className="text-xs text-surface-500 mt-1.5">{status.sub}</p>
      </div>
    </Card>
  );
}

// Speaker button reused for both "Voice Guide" (header) and "Play Advice"
// (advice card) -- both just read Hausa text aloud via the same backend
// endpoint (see backend/src/ttsService.js). Real audio, not a mockup.
function VoiceButton({ text, label, className }) {
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const objectUrlRef = useRef(null);

  async function handlePlay() {
    if (!text || status === "loading") return;
    setStatus("loading");
    try {
      const blob = await fetchHausaAudio(text);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      await new Audio(url).play();
      setStatus("idle");
    } catch (err) {
      console.error("[TTS] Failed to play audio:", err.message);
      setStatus("error");
    }
  }

  return (
    <button
      onClick={handlePlay}
      disabled={!text || status === "loading"}
      className={`inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Volume2 size={15} />
      {status === "loading" ? "Generating…" : status === "error" ? "Try again" : label}
    </button>
  );
}

/* ─── Soil Moisture Guide -- static reference photos, not live data;
   helps a farmer visually compare their own soil against examples. ──── */
function SoilMoistureGuide() {
  const items = [
    { label: "DRY", sub: "Needs water", tone: "bad", image: soilDryPhoto },
    { label: "OKAY", sub: "Good", tone: "good", image: soilOkayPhoto },
    { label: "WET", sub: "Too much water", tone: "warn", image: soilWetPhoto },
  ];
  return (
    <Card padding="md">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-3">Soil Moisture Guide</p>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it) => (
          <div key={it.label} className={`rounded-lg border-2 overflow-hidden`} style={{ borderColor: it.tone === "bad" ? "#ef4444" : it.tone === "warn" ? "#f59e0b" : "#22c55e" }}>
            <div className="h-16">
              <img src={it.image} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="px-2 py-1.5 text-center">
              <p className="text-[10px] font-bold text-surface-900">{it.label}</p>
              <p className="text-[9px] text-surface-400">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── AIDashboard ──────────────────────────────────────────────────── */
export default function AIDashboard() {
  const nodes = useSensorData();
  const aiDashboard = useAIDashboard();
  const { pumpStates, pumpLoadings, setPumpForCrop } = useCropControls();
  const { isDemoMode } = useDemoStatus();
  const [selected, setSelected] = useState("rice");

  const nodeFor = (cropKey) => nodes.find((n) => n.id === CROP_META[cropKey].id) ?? null;
  const onlineCount = CROP_KEYS.filter((k) => nodeFor(k)?.connectivity === "live").length;

  const node = nodeFor(selected);
  const aiData = aiDashboard[selected] ?? null;
  const meta = CROP_META[selected];

  const moistureStatus = classifyMoisture(node?.moisture);
  const cropHealthStatus = classifyCropHealth(aiData);
  const soilConditionStatus = classifySoilCondition(aiData);
  const sensorStatus = classifySensorStatus(node);

  const farmTone = worstTone(
    ...CROP_KEYS.map((k) => {
      const n = nodeFor(k);
      const a = aiDashboard[k] ?? null;
      return worstTone(classifyMoisture(n?.moisture).tone, classifyCropHealth(a).tone, classifySensorStatus(n).tone);
    })
  );
  const farmHeadline =
    farmTone === "bad" ? "Your farm needs attention" :
    farmTone === "warn" ? "Some fields need attention soon" :
    "Your farm is doing well";
  const farmSub =
    farmTone === "good" ? "No action needed now. Check again later." :
    "Check the fields below for what needs attention.";

  const pumpState = pumpStates[selected];
  const pumpLoading = pumpLoadings[selected];
  const isPumpOn = pumpState === "ON";

  const adviceText = aiData?.farmer_message ?? "The system is still gathering information about your farm. Check back soon.";
  const adviceAudioText = aiData?.farmer_message_ha;

  return (
    <motion.div
      className="max-w-6xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs text-surface-400">My Farm</p>
          <h1 className="text-2xl font-bold text-surface-900">Home</h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {isDemoMode && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-amber-100 text-amber-700">
              Demo Mode
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? "bg-semantic-green" : "bg-surface-300"}`} />
            {onlineCount} devices online
          </span>
          <VoiceButton
            text={adviceAudioText}
            label="Voice Guide"
            className="bg-semantic-green text-white px-4 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Left column (~70%) */}
        <div className="space-y-4">
          {/* Farm Status */}
          <Card padding="none" className="overflow-hidden">
            <div className="p-5 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Farm Status</p>
              <h2 className={`text-2xl font-bold mb-1 ${TONE_STYLES[farmTone].text}`}>{farmHeadline}</h2>
              <p className="text-sm text-surface-500">{farmSub}</p>
            </div>
            <div className="h-40 sm:h-48">
              <img src={farmRowsPhoto} alt="Crop rows on the farm" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </Card>

          {/* Four plain-language status tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Soil Water" image={soilWaterPhoto} status={moistureStatus} />
            <StatTile label="Crop Health" image={cropHealthPhoto} status={cropHealthStatus} />
            <StatTile label="Soil Condition" image={soilConditionPhoto} status={soilConditionStatus} />
            <StatTile label="Sensor Status" image={sensorStatusPhoto} status={sensorStatus} />
          </div>

          {/* Your Fields -- click a zone to control/hear advice for it */}
          <Card padding="none" className="overflow-hidden">
            <div className="h-36 sm:h-44">
              <img src={farmFieldsMapPhoto} alt="Aerial view of the farm's fields" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-3">Your Fields</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {CROP_KEYS.map((key) => {
                  const n = nodeFor(key);
                  const a = aiDashboard[key] ?? null;
                  const tone = worstTone(classifyMoisture(n?.moisture).tone, classifyCropHealth(a).tone, classifySensorStatus(n).tone);
                  const label = tone === "good" ? "GOOD" : classifyMoisture(n?.moisture).label;
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border-2 transition-colors text-left ${isSelected ? "border-accent bg-accent/5" : "border-surface-200 hover:border-surface-300"}`}
                    >
                      <span className="text-sm font-semibold text-surface-900">{CROP_META[key].zoneLabel}</span>
                      <StatusPill label={label} tone={tone} />
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column (~30%) */}
        <div className="space-y-4">
          {/* Irrigation Control -- targets whichever zone is selected on the left */}
          <Card padding="md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Pump Status</p>
            <h3 className={`text-xl font-bold mb-0.5 ${isPumpOn ? "text-semantic-green" : "text-surface-500"}`}>
              {pumpState === null ? "Connecting…" : isPumpOn ? "Pump is ON" : "Pump is OFF"}
            </h3>
            <p className="text-xs text-surface-400 mb-3">{CROP_META[selected].zoneLabel} · {meta.label}</p>
            <div className="h-28 rounded-lg overflow-hidden mb-3">
              <img src={irrigationPumpPhoto} alt="Irrigation pump" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <button
              onClick={() => setPumpForCrop(selected, "ON")}
              disabled={isPumpOn || pumpState === null || pumpLoading}
              className="w-full py-2.5 mb-2 text-sm font-bold rounded-lg bg-semantic-green text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
            >
              {pumpLoading && !isPumpOn ? "Sending…" : "START WATERING"}
            </button>
            <button
              onClick={() => setPumpForCrop(selected, "OFF")}
              disabled={!isPumpOn || pumpLoading}
              className="w-full py-2.5 text-sm font-bold rounded-lg border-2 border-semantic-red text-semantic-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50"
            >
              {pumpLoading && isPumpOn ? "Sending…" : "STOP WATERING"}
            </button>
          </Card>

          {/* Farm Advice */}
          <Card padding="md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-3">Farm Advice</p>
            <div className="bg-semantic-green/10 border border-semantic-green/30 rounded-lg p-4 mb-3">
              <p className="text-sm text-surface-800 leading-relaxed">{adviceText}</p>
            </div>
            <VoiceButton
              text={adviceAudioText}
              label="Play Advice"
              className="w-full bg-green-800 text-white py-2.5 text-sm hover:bg-green-900"
            />
          </Card>

          <SoilMoistureGuide />
        </div>
      </div>
    </motion.div>
  );
}
