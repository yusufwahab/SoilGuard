import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Volume2, AlertTriangle } from "lucide-react";
import { useAIDashboard, useCropControls, useSensorData, useDemoStatus } from "../data/SensorContext";
import { fetchHausaAudio } from "../data/ttsService";
import Card from "../components/ui/Card";

// Real farm photography (supplied by the user) -- replaces every stock
// Unsplash placeholder that stood in for these during earlier drafts.
import irrigationPumpPhoto from "../assets/dashboard/05_irrigation_pump.png";
import farmFieldsMapPhoto from "../assets/dashboard/06_farm_fields_map.png";
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

function classifySensorStatus(node) {
  if (!node) return { label: "NO DEVICE", sub: "Not set up yet", tone: "neutral" };
  if (node.connectivity === "live") return { label: "WORKING WELL", sub: "Sensor is active", tone: "good" };
  if (node.connectivity === "demo") return { label: "DEMO DATA", sub: "Showing sample data", tone: "warn" };
  return { label: "OFFLINE", sub: "Device disconnected", tone: "bad" };
}

// ── Risk-gauge classifiers -- corrosion/fungi are 0-10 scores from the AI
// (backend/src/analyze.js), sensor health is already a 0-100 pct. Same
// good/warn/bad tone system as the rest of the app, not a separate one. ──
function classifyRiskScore(score) {
  if (score == null) return { label: "CHECKING", tone: "neutral" };
  if (score >= 7) return { label: "HIGH RISK", tone: "bad" };
  if (score >= 4) return { label: "MODERATE RISK", tone: "warn" };
  return { label: "LOW RISK", tone: "good" };
}

function classifyHealthPct(pct) {
  if (pct == null) return { label: "CHECKING", tone: "neutral" };
  if (pct < 50) return { label: "POOR", tone: "bad" };
  if (pct < 80) return { label: "FAIR", tone: "warn" };
  return { label: "GOOD", tone: "good" };
}

const CORROSION_DESC = { good: "Everything looks good", warn: "Keep an eye on buried parts", bad: "Metal parts need checking", neutral: "Waiting for update" };
const FUNGI_DESC      = { good: "No signs of disease", warn: "Watch for early symptoms", bad: "Disease risk is high", neutral: "Waiting for update" };
const SENSOR_HEALTH_DESC = { good: "Sensors are healthy", warn: "Sensors need attention soon", bad: "Sensor needs servicing", neutral: "Waiting for update" };

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

// Vertical two-tone bar (filled from the bottom by pct, in the tone's
// color) + a big percentage + a short risk word + a one-line explanation --
// the same real corrosion/fungi/sensor-health numbers the old 1-10 gauges
// showed, just in a glanceable format a non-technical farmer can read.
const GAUGE_COLOR = { good: "#16a34a", warn: "#d97706", bad: "#dc2626", neutral: "#94a3b8" };

function RiskGauge({ label, sub, pct, riskLabel, tone, description }) {
  const filled = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <Card padding="md">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">{label}</p>
      <p className="text-xs text-surface-400 mb-3">{sub}</p>
      <div className="flex items-center gap-4">
        <div className="w-6 h-24 rounded-full bg-indigo-950 overflow-hidden flex flex-col justify-end shrink-0">
          <div className="w-full transition-all" style={{ height: `${filled}%`, backgroundColor: GAUGE_COLOR[tone] }} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${TONE_STYLES[tone].text}`}>{pct == null ? "—" : `${Math.round(pct)}%`}</p>
          <p className={`text-[11px] font-bold uppercase tracking-wide ${TONE_STYLES[tone].text}`}>{riskLabel}</p>
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-3">{description}</p>
    </Card>
  );
}

/* ─── Irrigation Control -- Manual Override Target: sets the moisture %
   the device should auto-pump toward (real writeTargetMoisture, same
   mechanism as FieldDetail.jsx's AutopilotControl), plus a direct manual
   on/off override underneath for an immediate action. ────────────────── */
function ManualOverrideTarget({ cropKey, cropLabel, aiData }) {
  const { autopilotTargets, setAutopilot, pumpStates, pumpLoadings, setPumpForCrop } = useCropControls();
  const target = autopilotTargets[cropKey] ?? 60;
  const [localTarget, setLocalTarget] = useState(target);
  const [saving, setSaving] = useState(false);

  const pumpState = pumpStates[cropKey];
  const pumpLoading = pumpLoadings[cropKey];
  const isPumpOn = pumpState === "ON";

  // The AI's own suggested target (backend/src/analyze.js -- calculated from
  // this crop, the weather forecast, and current sensor trends). Purely a
  // suggestion: the farmer's manual slider above is the real target unless
  // they explicitly tap "Use" -- ignoring it does nothing, on purpose.
  const recommended = typeof aiData?.recommended_target === "number" ? aiData.recommended_target : null;
  const followingRecommendation = recommended !== null && recommended === localTarget;

  async function commitTarget(val) {
    setSaving(true);
    try {
      await setAutopilot(cropKey, true, val);
    } finally {
      setSaving(false);
    }
  }

  function useRecommendation() {
    if (recommended === null) return;
    setLocalTarget(recommended);
    commitTarget(recommended);
  }

  return (
    <Card padding="md">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Irrigation Control</p>
      <p className="text-xs text-surface-400 mb-3">Manual Override Target · {cropLabel}</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden shrink-0">
          <img src={irrigationPumpPhoto} alt="Irrigation pump" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-semantic-green mb-2">{localTarget}%</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-surface-400 w-5 shrink-0">0%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={localTarget}
              onChange={(e) => setLocalTarget(Number(e.target.value))}
              onMouseUp={(e) => commitTarget(Number(e.target.value))}
              onTouchEnd={(e) => commitTarget(Number(e.target.value))}
              className="flex-1 accent-semantic-green h-1.5 cursor-pointer"
            />
            <span className="text-[10px] text-surface-400 w-10 shrink-0 text-right">100%</span>
          </div>

          {/* AI recommendation -- a suggestion the farmer can follow or ignore,
              not a value pushed on them. Doing nothing here keeps whatever
              the slider above is set to. */}
          {recommended !== null && (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-[11px] text-surface-500">
                AI suggests <strong className="text-surface-800">{recommended}%</strong> for this crop
              </span>
              {followingRecommendation ? (
                <span className="text-[11px] font-semibold text-semantic-green">· using this ✓</span>
              ) : (
                <button
                  onClick={useRecommendation}
                  disabled={saving}
                  className="text-[11px] font-semibold text-accent hover:underline disabled:opacity-50"
                >
                  · Use it
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-surface-600 bg-semantic-green/10 border border-semantic-green/30 rounded-lg px-3 py-2 mt-3">
        Pump will start when soil moisture reaches this target.{saving ? " Saving…" : ""}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => setPumpForCrop(cropKey, "ON")}
          disabled={isPumpOn || pumpState === null || pumpLoading}
          className="py-2.5 text-sm font-bold rounded-lg bg-semantic-green text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
        >
          TURN PUMP ON
          <span className="block text-[10px] font-normal opacity-90">Start Watering</span>
        </button>
        <button
          onClick={() => setPumpForCrop(cropKey, "OFF")}
          disabled={!isPumpOn || pumpLoading}
          className="py-2.5 text-sm font-bold rounded-lg border-2 border-semantic-red text-semantic-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50"
        >
          TURN PUMP OFF
          <span className="block text-[10px] font-normal opacity-90">Stop Watering</span>
        </button>
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

/* ─── Soil Moisture Guide -- now doubles as the "Your Fields" zone map:
   the aerial photo is the main visual, with a compact real-data zone
   selector underneath (click a zone to control/hear advice for it). ──── */
function SoilMoistureGuide({ nodeFor, aiDashboard, selected, setSelected }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 px-4 pt-4 pb-3">Soil Moisture Guide</p>
      <div className="h-36 sm:h-44">
        <img src={farmFieldsMapPhoto} alt="Aerial view of the farm's fields" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-4 grid grid-cols-3 gap-2">
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
              className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg border-2 transition-colors text-center ${isSelected ? "border-accent bg-accent/5" : "border-surface-200 hover:border-surface-300"}`}
            >
              <span className="text-[11px] font-semibold text-surface-900">{CROP_META[key].zoneLabel}</span>
              <StatusPill label={label} tone={tone} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── AIDashboard ──────────────────────────────────────────────────── */
export default function AIDashboard() {
  const navigate = useNavigate();
  const nodes = useSensorData();
  const aiDashboard = useAIDashboard();
  const { pumpStates, pumpLoadings, setPumpForCrop } = useCropControls();
  const { isDemoMode } = useDemoStatus();
  const [selected, setSelected] = useState("rice");

  const nodeFor = (cropKey) => nodes.find((n) => n.id === CROP_META[cropKey].id) ?? null;
  const onlineCount = CROP_KEYS.filter((k) => nodeFor(k)?.connectivity === "live").length;

  // Same active-alert data the Bell icon badge (TopStrip.jsx), the Overview
  // field cards, and the Alerts page all read from node.alerts -- surfaced
  // here too so a disconnected sensor is impossible to miss on the home
  // screen, not just buried in a badge count.
  const activeCriticalAlerts = nodes.flatMap((n) => n.alerts.filter((a) => a.status === "active" && a.severity === "critical"));

  const aiData = aiDashboard[selected] ?? null;
  const meta = CROP_META[selected];

  const corrosionScore = aiData?.corrosion_risk_score ?? null; // 0-10
  const corrosionPct = corrosionScore == null ? null : corrosionScore * 10;
  const corrosionRisk = classifyRiskScore(corrosionScore);

  const fungiScore = aiData?.fungi_risk_score ?? null; // 0-10
  const fungiPct = fungiScore == null ? null : fungiScore * 10;
  const fungiRisk = classifyRiskScore(fungiScore);

  const sensorHealthPct = aiData?.sensor_health_pct ?? null; // already 0-100
  const sensorHealthStatus = classifyHealthPct(sensorHealthPct);

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

      {/* Device-disconnect alert banner -- same active alerts the Bell icon
          badge and Alerts page show, surfaced here so it can't be missed. */}
      {activeCriticalAlerts.length > 0 && (
        <button
          onClick={() => navigate("/app/alerts")}
          className="w-full flex items-center justify-between gap-3 mb-4 rounded-xl border-l-4 border-semantic-red bg-red-50 px-4 py-3 text-left hover:bg-red-100/70 transition-colors"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={17} className="text-semantic-red shrink-0" />
            <span className="text-sm font-semibold text-semantic-red truncate">
              {activeCriticalAlerts.length === 1
                ? activeCriticalAlerts[0].headline
                : `${activeCriticalAlerts.length} devices need attention`}
            </span>
          </span>
          <span className="text-xs font-semibold text-semantic-red shrink-0">View alerts →</span>
        </button>
      )}

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

          {/* Risk & health gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RiskGauge
              label="Corrosion Risk" sub="Risk Level"
              pct={corrosionPct} riskLabel={corrosionRisk.label} tone={corrosionRisk.tone}
              description={CORROSION_DESC[corrosionRisk.tone]}
            />
            <RiskGauge
              label="Fungi / Disease Risk" sub="Risk Level"
              pct={fungiPct} riskLabel={fungiRisk.label} tone={fungiRisk.tone}
              description={FUNGI_DESC[fungiRisk.tone]}
            />
            <RiskGauge
              label="Sensor Health Lifecycle" sub="Health Level"
              pct={sensorHealthPct} riskLabel={sensorHealthStatus.label} tone={sensorHealthStatus.tone}
              description={SENSOR_HEALTH_DESC[sensorHealthStatus.tone]}
            />
          </div>

          {/* Irrigation Control -- Manual Override Target */}
          {/* key= remounts on zone change so the slider re-reads that
              crop's own target instead of carrying over a stale value */}
          <ManualOverrideTarget key={selected} cropKey={selected} cropLabel={meta.label} aiData={aiData} />
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

          <SoilMoistureGuide nodeFor={nodeFor} aiDashboard={aiDashboard} selected={selected} setSelected={setSelected} />
        </div>
      </div>
    </motion.div>
  );
}
