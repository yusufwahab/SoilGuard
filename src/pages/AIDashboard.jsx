import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ShieldAlert, Droplets, Thermometer, Wind, FlaskConical, AlertTriangle, Zap } from "lucide-react";
import { useCropControls, useAIDashboard, useSensorData } from "../data/SensorContext";
import { writeTargetMoisture } from "../data/firebaseService";

/* ─── Crop config ───────────────────────────────────────────────── */
const CROP_META = {
  beans: { label: "Beans", color: "#d97706", image: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=48&h=48&q=80", id: "SG-BEANS", defaultTarget: 60 },
  rice:  { label: "Rice",  color: "#16a34a", image: "/Rice.jpg",  id: "SG-RICE",  defaultTarget: 70 },
  yam:   { label: "Yam",   color: "#7c3aed", image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=48&h=48&q=80", id: "SG-YAM",   defaultTarget: 65 },
};

const CROPS = ["beans", "rice", "yam"];

/* ─── Dark theme tokens ─────────────────────────────────────────── */
const D = {
  bg:        "#0f1117",
  card:      "#1a1d27",
  border:    "#2a2d3a",
  borderHi:  "#3a3d4a",
  text:      "#e2e8f0",
  textMuted: "#64748b",
  textDim:   "#94a3b8",
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function riskColor(score) {
  if (score >= 7) return "#ef4444";
  if (score >= 4) return "#f59e0b";
  return "#22c55e";
}

function DarkProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#2a2d3a" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function DarkCard({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: D.card, border: `1px solid ${D.border}`, ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: D.textMuted }}>
      {children}
    </p>
  );
}

/* ─── Card 1: Live Environmental Data ───────────────────────────── */
function LiveEnvCard({ sensor, cropColor }) {
  const pH = sensor?.pH;
  const pHVal = typeof pH === "number" ? pH.toFixed(2) : (pH ?? "—");

  const isFault =
    sensor &&
    (sensor.moisture ?? 0) === 0 &&
    (sensor.temperature ?? 0) === 0 &&
    (sensor.humidity ?? 0) === 0;

  const readings = [
    { label: "Moisture",    value: sensor?.moisture?.toFixed(0) ?? "—", unit: "%",  icon: <Droplets size={14} />,    color: "#0284c7" },
    { label: "Temperature", value: sensor?.temperature?.toFixed(1) ?? "—", unit: "°C", icon: <Thermometer size={14} />, color: "#dc2626" },
    { label: "Humidity",    value: sensor?.humidity?.toFixed(0) ?? "—",    unit: "%",  icon: <Wind size={14} />,        color: "#7c3aed" },
    { label: "pH",          value: pHVal,                                  unit: "",   icon: <FlaskConical size={14} />, color: cropColor },
  ];

  return (
    <DarkCard
      style={{
        background: D.card,
        border: `1px solid ${isFault ? "#ef4444" : D.border}`,
        boxShadow: isFault ? "0 0 0 1px #ef444440" : "none",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Live Environmental Data</SectionLabel>
        {!sensor ? (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#27272a", color: D.textMuted }}>
            Connecting…
          </span>
        ) : (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: "#16a34a20", color: "#22c55e" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-ping-live" />
            Live
          </span>
        )}
      </div>

      {isFault && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3" style={{ background: "#ef444415", border: "1px solid #ef444440" }}>
          <AlertTriangle size={13} color="#ef4444" />
          <span className="text-xs font-bold tracking-wide" style={{ color: "#ef4444" }}>
            HARDWARE FAULT: CHECK PROBE
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {readings.map(({ label, value, unit, icon, color }) => (
          <div key={label} className="flex flex-col items-center text-center p-3 rounded-lg"
            style={{ background: "#13151f", border: `1px solid ${D.border}` }}>
            <span style={{ color }} className="mb-1.5">{icon}</span>
            <span className="font-mono text-xl font-bold tabular-nums leading-none" style={{ color: D.text }}>
              {value}<span className="text-xs font-normal ml-0.5" style={{ color: D.textMuted }}>{unit}</span>
            </span>
            <span className="text-[10px] mt-1" style={{ color: D.textMuted }}>{label}</span>
          </div>
        ))}
      </div>
    </DarkCard>
  );
}

/* ─── Card 2: Materials & AI Intelligence ───────────────────────── */
function MaterialsAICard({ aiData, cropColor }) {
  const decision = aiData?.decision ?? null;
  const decisionStyle =
    decision === "IRRIGATE" ? { bg: "#16a34a20", color: "#22c55e", border: "#22c55e40" } :
    decision === "POSTPONE" ? { bg: "#d9770620", color: "#f59e0b", border: "#f59e0b40" } :
    { bg: "#27272a", color: D.textDim, border: D.border };

  const corrosion    = aiData?.corrosion_risk_score  ?? null;
  const fungi        = aiData?.fungi_risk_score       ?? null;
  const sensorHealth = aiData?.sensor_life_cycle_percent ?? null;

  return (
    <DarkCard>
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={14} style={{ color: cropColor }} />
        <SectionLabel>Materials &amp; AI Intelligence</SectionLabel>
        {!aiData && (
          <span className="ml-auto text-[9px] animate-pulse" style={{ color: D.textMuted }}>
            Awaiting n8n report…
          </span>
        )}
      </div>

      {/* AI Decision */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-medium" style={{ color: D.textMuted }}>AI Decision:</span>
        {decision ? (
          <span className="text-sm font-bold px-3 py-1 rounded-lg tracking-widest"
            style={{ background: decisionStyle.bg, color: decisionStyle.color, border: `1px solid ${decisionStyle.border}` }}>
            {decision}
          </span>
        ) : (
          <span className="text-xs" style={{ color: D.textMuted }}>—</span>
        )}
      </div>

      {/* Farmer message */}
      {aiData?.farmer_message && (
        <div className="rounded-lg p-3 mb-4 text-sm leading-relaxed"
          style={{ background: "#13151f", border: `1px solid ${cropColor}40`, borderLeft: `3px solid ${cropColor}`, color: D.textDim }}>
          {aiData.farmer_message}
        </div>
      )}

      {/* Progress bars */}
      <div className="space-y-3">
        {/* Corrosion */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: D.textMuted }}>Corrosion Risk</span>
            <span className="font-mono text-xs font-bold tabular-nums" style={{ color: corrosion !== null ? riskColor(corrosion) : D.textMuted }}>
              {corrosion !== null ? `${corrosion}/10` : "—"}
            </span>
          </div>
          <DarkProgressBar value={corrosion ?? 0} max={10} color={riskColor(corrosion ?? 0)} />
        </div>

        {/* Fungi */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: D.textMuted }}>Fungal Risk</span>
            <span className="font-mono text-xs font-bold tabular-nums" style={{ color: fungi !== null ? riskColor(fungi) : D.textMuted }}>
              {fungi !== null ? `${fungi}/10` : "—"}
            </span>
          </div>
          <DarkProgressBar value={fungi ?? 0} max={10} color={riskColor(fungi ?? 0)} />
        </div>

        {/* Sensor health */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: D.textMuted }}>Sensor Health</span>
            <span className="font-mono text-xs font-bold tabular-nums" style={{ color: "#22c55e" }}>
              {sensorHealth !== null ? `${sensorHealth}%` : "—"}
            </span>
          </div>
          <DarkProgressBar value={sensorHealth ?? 0} max={100} color="#22c55e" />
        </div>
      </div>

      {/* MME note */}
      <p className="text-[10px] mt-4 pt-3 leading-relaxed" style={{ color: D.textMuted, borderTop: `1px solid ${D.border}` }}>
        <span className="font-semibold" style={{ color: D.textDim }}>MME relevance:</span> Galvanic corrosion prediction on buried metallic probes driven by live EC, pH &amp; moisture.
      </p>
    </DarkCard>
  );
}

/* ─── Card 3: Manual Override & Pump Control ─────────────────────── */
function PumpControlCard({ cropKey, cropColor, sensor, aiData, targetMoisture, defaultTarget }) {
  const { pumpStates, pumpLoadings, setPumpForCrop } = useCropControls();
  const pumpState = pumpStates[cropKey];
  const loading   = pumpLoadings[cropKey];
  const isOn      = pumpState === "ON";

  // Initialise slider from: live target_moisture → AI recommended → hardcoded default
  const initialTarget = targetMoisture ?? aiData?.recommended_target ?? defaultTarget;
  const [sliderTarget, setSliderTarget] = useState(initialTarget);
  const [saving, setSaving] = useState(false);

  // Keep slider in sync when target_moisture arrives from Firebase
  useEffect(() => {
    if (targetMoisture !== null && targetMoisture !== undefined) {
      setSliderTarget(Math.round(targetMoisture));
    }
  }, [targetMoisture]);

  // Safety interlock: disable ON if moisture >= target
  const currentMoisture = sensor?.moisture ?? 0;
  const interlock = currentMoisture >= sliderTarget;

  const pumpStatusFromTelemetry = (sensor?.pumpStatus ?? 0) === 1;

  async function handleSlider(val) {
    setSliderTarget(val);
    setSaving(true);
    try { await writeTargetMoisture(cropKey, val); }
    finally { setSaving(false); }
  }

  function handlePump(desired) {
    if (desired === "ON" && interlock) return;
    setPumpForCrop(cropKey, desired);
  }

  return (
    <DarkCard>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} style={{ color: cropColor }} />
        <SectionLabel>Manual Override &amp; Pump Control</SectionLabel>
      </div>

      {/* Pump status pill */}
      <div className="flex items-center justify-between p-3 rounded-lg mb-5"
        style={{ background: "#13151f", border: `1px solid ${isOn ? "#22c55e40" : D.border}` }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isOn ? "#22c55e" : "#3a3d4a",
              boxShadow: isOn ? "0 0 0 4px #22c55e20" : "none",
            }}
          />
          <span className="text-sm font-bold" style={{ color: D.text }}>
            {pumpState === null ? "Connecting…" : isOn ? "Pump Running" : "Pump Stopped"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "#27272a", color: D.textMuted }}>
            telemetry: {pumpStatusFromTelemetry ? "ON" : "OFF"}
          </span>
        </div>
        {loading && <span className="text-[10px] animate-pulse" style={{ color: D.textMuted }}>Sending…</span>}
      </div>

      {/* Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: D.textDim }}>Manual Target Moisture</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-base font-bold tabular-nums" style={{ color: cropColor }}>
              {sliderTarget}%
            </span>
            {saving && <span className="text-[9px] animate-pulse" style={{ color: D.textMuted }}>Saving…</span>}
          </div>
        </div>
        <input
          type="range"
          min={0} max={100}
          value={sliderTarget}
          onChange={(e) => handleSlider(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${cropColor} ${sliderTarget}%, #2a2d3a ${sliderTarget}%)`,
            outline: "none",
          }}
        />
        <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: D.textMuted }}>
          <span>0</span><span>50</span><span>100</span>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: D.textMuted }}>
          Pump auto-locks when moisture reaches this target
        </p>

        {/* Interlock warning */}
        {interlock && (
          <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2"
            style={{ background: "#f59e0b10", border: "1px solid #f59e0b30" }}>
            <AlertTriangle size={12} color="#f59e0b" />
            <span className="text-[10px] font-semibold" style={{ color: "#f59e0b" }}>
              Interlock active — moisture ({currentMoisture}%) ≥ target ({sliderTarget}%). Pump disabled.
            </span>
          </div>
        )}
      </div>

      {/* Pump buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: (!isOn && !interlock && !loading && pumpState !== null) ? 1.02 : 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handlePump("ON")}
          disabled={isOn || interlock || loading || pumpState === null}
          className="py-3 text-sm font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: (!isOn && !interlock && pumpState !== null) ? cropColor : "#2a2d3a",
            color: (!isOn && !interlock && pumpState !== null) ? "white" : D.textMuted,
            border: `1px solid ${(!isOn && !interlock && pumpState !== null) ? cropColor : D.border}`,
          }}
        >
          {isOn ? "● Running" : "Turn Pump ON"}
        </motion.button>
        <motion.button
          whileHover={{ scale: (isOn && !loading) ? 1.02 : 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handlePump("OFF")}
          disabled={!isOn || loading}
          className="py-3 text-sm font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "#13151f",
            color: isOn ? "#ef4444" : D.textMuted,
            border: `1px solid ${isOn ? "#ef444440" : D.border}`,
          }}
        >
          Turn Pump OFF
        </motion.button>
      </div>
    </DarkCard>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */
export default function AIDashboard() {
  const [activeTab, setActiveTab] = useState("beans");
  const aiDashboard = useAIDashboard();
  const { targetMoistures, realNodes } = useCropControls();
  const allNodes = useSensorData();

  const meta       = CROP_META[activeTab];
  const node       = allNodes.find((n) => n.id === meta.id) ?? null;
  const sensor     = node ? {
    moisture:    node.moisture,
    temperature: node.temperature,
    humidity:    node.humidity,
    pH:          node.pH,
    EC:          node.ec,
    pumpStatus:  node.pumpStatus,
  } : null;
  const aiData         = aiDashboard[activeTab] ?? null;
  const targetMoisture = targetMoistures[activeTab];

  return (
    <div className="w-full min-h-screen pb-10" style={{ background: D.bg, color: D.text }}>
      {/* Header */}
      <div className="mb-6 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} color="#7c3aed" />
          <h1 className="text-lg font-bold" style={{ color: D.text }}>AI Dashboard</h1>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: "#7c3aed20", color: "#a78bfa" }}>
            n8n · Firebase RT
          </span>
        </div>
        <p className="text-xs" style={{ color: D.textMuted }}>
          Real-time crop intelligence — sensor data synced every ~3 seconds via Firebase Realtime Database.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        {CROPS.map((key) => {
          const m = CROP_META[key];
          const isActive = activeTab === key;
          const cropNode = allNodes.find((n) => n.id === m.id);
          const isLive = cropNode?.connectivity === "live";
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: isActive ? "#13151f" : "transparent",
                color: isActive ? m.color : D.textMuted,
                border: isActive ? `1px solid ${m.color}40` : "1px solid transparent",
              }}
            >
              <img src={m.image} alt={m.label} className="w-5 h-5 rounded object-cover" />
              {m.label}
              {isLive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
                  style={{ background: "#22c55e", borderColor: D.card }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          {/* Card 1 */}
          <LiveEnvCard sensor={sensor} cropColor={meta.color} />

          {/* Cards 2 + 3 side by side on wider screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MaterialsAICard aiData={aiData} cropColor={meta.color} />
            <PumpControlCard
              cropKey={activeTab}
              cropColor={meta.color}
              sensor={sensor}
              aiData={aiData}
              targetMoisture={targetMoisture}
              defaultTarget={meta.defaultTarget}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
