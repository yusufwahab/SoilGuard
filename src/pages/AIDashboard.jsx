import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ShieldAlert, Droplets, Thermometer, Wind, FlaskConical } from "lucide-react";
import { useAIDashboard, useCropControls, useSensorData } from "../data/SensorContext";
import { writeTargetMoisture } from "../data/firebaseService";
import Card from "../components/ui/Card";

/* ─── Crop config ───────────────────────────────────────────────── */
const CROP_META = {
  rice:  { label: "Rice",  color: "#16a34a", bg: "from-green-900/80",  image: "/Rice.jpg", icon: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=48&h=48&q=80", id: "SG-RICE"  },
  beans: { label: "Beans", color: "#d97706", bg: "from-amber-900/80",  image: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1200&q=80", icon: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=48&h=48&q=80", id: "SG-BEANS" },
  yam:   { label: "Yam",   color: "#7c3aed", bg: "from-purple-900/80", image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=80", icon: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=48&h=48&q=80", id: "SG-YAM"   },
};

/* ─── Mock AI fallback data ─────────────────────────────────────── */
const MOCK_AI = {
  rice: {
    farmer_message: "Moisture levels are stable. No irrigation required at this time. Monitor EC levels over the next 24 hours.",
    recommended_target: 65,
    fungi_risk_score: 3,
    fungi_advice: "Low risk. Canopy ventilation is adequate.",
    material_health_status: "OK: Soil chemistry within safe corrosion thresholds. Sensor probes are healthy.",
    decision: "MONITOR",
    corrosion_risk_score: 2,
    sensor_health_pct: 96,
  },
  beans: {
    farmer_message: "Moisture is critically low (18%), but irrigation is currently postponed due to detected light rain. We are utilizing natural precipitation to conserve water. If moisture levels do not improve after the rain subsides, a manual override or scheduled irrigation may be required.",
    recommended_target: 35,
    fungi_risk_score: 4,
    fungi_advice: "Moderate risk. Humidity above 75% detected. Apply preventative fungicide.",
    material_health_status: "Warning: EC reading at 2.8 dS/m — elevated salinity stress on metallic sensor probes. Schedule probe cleaning within 2 weeks.",
    decision: "POSTPONE",
    corrosion_risk_score: 3,
    sensor_health_pct: 92,
  },
  yam: {
    farmer_message: "pH is optimal at 6.2. Tuber development stage detected — reduce irrigation frequency to every 3 days to prevent waterlogging and tuber rot.",
    recommended_target: 45,
    fungi_risk_score: 2,
    fungi_advice: "Low risk. Conditions are dry and well-ventilated. No action required.",
    material_health_status: "OK: Soil chemistry is within safe corrosion thresholds. LSI index is neutral. Sensor probes are healthy.",
    decision: "IRRIGATE",
    corrosion_risk_score: 1,
    sensor_health_pct: 98,
  },
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function riskColor(score, max = 10) {
  const pct = score / max;
  if (pct >= 0.7) return "#ef4444";
  if (pct >= 0.4) return "#f59e0b";
  return "#22c55e";
}

function RiskScore({ label, score, max = 10 }) {
  const color = riskColor(score, max);
  const pct = (score / max) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-surface-500">{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

const DECISION_STYLES = {
  IRRIGATE: { bg: "#dcfce7", color: "#16a34a", border: "#22c55e40" },
  POSTPONE: { bg: "#fef9c3", color: "#d97706", border: "#f59e0b40" },
  MONITOR:  { bg: "#eff6ff", color: "#0284c7", border: "#0284c740" },
  ALERT:    { bg: "#fee2e2", color: "#ef4444", border: "#ef444440" },
};

/* ─── Live Sensor Strip ──────────────────────────────────────────── */
function LiveSensorStrip({ node, cropColor }) {
  if (!node) {
    return (
      <Card>
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-3">Live Sensor Readings</p>
        <p className="text-xs text-surface-400 py-4 text-center">Connecting to device…</p>
      </Card>
    );
  }

  const readings = [
    { label: "Moisture", value: node.moisture?.toFixed(0), unit: "%",  icon: <Droplets size={13} />, color: "#0284c7" },
    { label: "Temp",     value: node.temperature?.toFixed(1), unit: "°C", icon: <Thermometer size={13} />, color: "#dc2626" },
    { label: "Humidity", value: node.humidity?.toFixed(0), unit: "%",  icon: <Wind size={13} />,     color: "#7c3aed" },
    { label: "pH",       value: node.pH?.toFixed(1), unit: "",         icon: <FlaskConical size={13} />, color: cropColor },
  ];

  const isLive = node.connectivity === "live";

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Live Sensor Readings</p>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isLive ? "bg-semantic-green/10 text-semantic-green" : "bg-surface-200 text-surface-400"}`}>
          {isLive ? "● Live" : "○ Offline"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {readings.map(({ label, value, unit, icon, color }) => (
          <div key={label} className="flex flex-col items-center text-center p-2.5 rounded-xl bg-surface-100/60 border border-surface-200">
            <span style={{ color }} className="mb-1">{icon}</span>
            <span className="font-mono text-lg font-bold tabular-nums leading-none text-surface-900">
              {value ?? "—"}<span className="text-xs font-normal text-surface-400">{unit}</span>
            </span>
            <span className="text-[10px] text-surface-400 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Materials Engineering Card ────────────────────────────────── */
function MaterialsCard({ data }) {
  const mhStatus = data?.material_health_status ?? "";
  const isOK      = mhStatus.toLowerCase().startsWith("ok");
  const isWarning = mhStatus.toLowerCase().startsWith("warning");
  const borderColor = isOK ? "#22c55e" : isWarning ? "#f59e0b" : "#ef4444";
  const badgeStyle  = isOK
    ? { bg: "#dcfce7", color: "#16a34a" }
    : isWarning
    ? { bg: "#fef9c3", color: "#d97706" }
    : { bg: "#fee2e2", color: "#ef4444" };

  return (
    <Card className="overflow-hidden">
      {/* Header banner */}
      <div
        className="flex items-center gap-2 -mx-4 -mt-4 px-4 py-2.5 mb-4"
        style={{ borderBottom: `2px solid ${borderColor}`, background: `${borderColor}10` }}
      >
        <ShieldAlert size={14} style={{ color: borderColor }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: borderColor }}>
          Materials Engineering
        </p>
        <span
          className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: badgeStyle.bg, color: badgeStyle.color }}
        >
          {isOK ? "SAFE" : isWarning ? "WARNING" : "CRITICAL"}
        </span>
      </div>

      {/* Probe image */}
      <div className="rounded-xl overflow-hidden h-28 relative mb-4">
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80"
          alt="Sensor probe"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.55) brightness(0.85)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent" />
        <p className="absolute bottom-2 left-3 text-[10px] text-white/80 font-medium">Galvanic corrosion risk — buried metallic probes</p>
      </div>

      {/* Risk scores */}
      <div className="space-y-3 mb-4">
        <RiskScore label="Corrosion Risk (1-10)" score={data?.corrosion_risk_score ?? 0} />
        <RiskScore label="Fungi / Disease Risk (1-10)" score={data?.fungi_risk_score ?? 0} />
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-surface-500">Sensor Health Lifecycle</span>
            <span className="font-mono text-sm font-bold tabular-nums text-semantic-green">
              {data?.sensor_health_pct ?? "—"}%
            </span>
          </div>
          <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-semantic-green"
              initial={{ width: 0 }}
              animate={{ width: `${data?.sensor_health_pct ?? 0}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Status message */}
      <div
        className="rounded-xl p-3 border text-xs text-surface-700 leading-relaxed"
        style={{ borderColor: `${borderColor}40`, background: `${borderColor}08` }}
      >
        {mhStatus || "Awaiting materials health analysis…"}
      </div>

      <p className="text-[10px] text-surface-400 mt-3 pt-3 border-t border-surface-100 leading-relaxed">
        <span className="font-semibold text-surface-500">MME Dept. relevance:</span> Real-time galvanic corrosion prediction on buried metallic infrastructure driven by live EC, pH &amp; moisture.
      </p>
    </Card>
  );
}

/* ─── AI Intelligence Card ──────────────────────────────────────── */
function AIIntelligenceCard({ data, cropColor }) {
  const decision = data?.decision ?? "MONITOR";
  const style = DECISION_STYLES[decision] ?? DECISION_STYLES.MONITOR;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={15} style={{ color: cropColor }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">AI Intelligence</p>
        {!data && <span className="ml-auto text-[9px] text-surface-400 animate-pulse">Waiting for n8n report…</span>}
      </div>

      {/* Decision badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-surface-500 font-medium">Decision:</span>
        <span
          className="text-sm font-bold px-3 py-1 rounded-lg tracking-wide"
          style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
        >
          {decision}
        </span>
      </div>

      {/* Recommended target */}
      {data?.recommended_target != null && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-surface-500 font-medium">AI Recommended:</span>
          <div className="flex items-center gap-1.5">
            <Droplets size={13} style={{ color: cropColor }} />
            <span className="font-mono text-base font-bold tabular-nums" style={{ color: cropColor }}>
              {data.recommended_target}%
            </span>
          </div>
        </div>
      )}

      {/* Message */}
      <div
        className="rounded-xl p-4 border text-sm text-surface-700 leading-relaxed"
        style={{ borderLeft: `3px solid ${cropColor}`, background: "linear-gradient(135deg, #faf8f5, #f5f2ed)" }}
      >
        {data?.farmer_message ?? "No AI report received yet. n8n will push the next analysis in 30–60 minutes."}
      </div>
    </Card>
  );
}

/* ─── Irrigation Control Card ───────────────────────────────────── */
function IrrigationControl({ cropKey, cropColor, targetMoisture }) {
  const { pumpStates, pumpLoadings, setPumpForCrop } = useCropControls();
  const state   = pumpStates[cropKey];
  const loading = pumpLoadings[cropKey];
  const isOn    = state === "ON";
  const unknown = state === null;

  const [manualTarget, setManualTarget] = useState(
    targetMoisture != null ? Math.round(targetMoisture) : 35
  );
  const [saving, setSaving] = useState(false);

  async function handleTargetChange(val) {
    setManualTarget(val);
    setSaving(true);
    try {
      await writeTargetMoisture(cropKey, val);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-4">Irrigation Control</p>

      {/* Pump status */}
      <div
        className="flex items-center justify-between p-3 rounded-xl mb-4 border"
        style={{
          background: isOn ? "#f0fdf4" : unknown ? "#faf8f5" : "#faf8f5",
          borderColor: isOn ? "#22c55e40" : "#e9e4db",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isOn ? "#22c55e" : unknown ? "#b8ad99" : "#d6cec0",
              boxShadow: isOn ? "0 0 0 4px #22c55e20" : "none",
            }}
          />
          <span className="text-sm font-bold text-surface-900">
            {unknown ? "Connecting…" : isOn ? "Pump Running" : "OFFLINE"}
          </span>
        </div>
        {loading && <span className="text-[10px] text-surface-400 animate-pulse">Sending…</span>}
      </div>

      {/* Target moisture slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-surface-500 font-medium">Manual Override Target</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-base font-bold tabular-nums" style={{ color: cropColor }}>
              {manualTarget}%
            </span>
            {saving && <span className="text-[9px] text-surface-400 animate-pulse ml-1">Saving…</span>}
          </div>
        </div>

        {/* Slider */}
        <div className="relative mb-1">
          <input
            type="range"
            min={0}
            max={100}
            value={manualTarget}
            onChange={(e) => handleTargetChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${cropColor} ${manualTarget}%, #e9e4db ${manualTarget}%)`,
              outline: "none",
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-surface-400 font-mono mb-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <p className="text-[10px] text-surface-400">Pump will lock when moisture reaches this target</p>
      </div>

      {/* Pump buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: isOn || unknown || loading ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPumpForCrop(cropKey, "ON")}
          disabled={isOn || unknown || loading}
          className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
          style={{ backgroundColor: cropColor }}
        >
          {isOn ? "● Running" : "Turn Pump ON"}
        </motion.button>
        <motion.button
          whileHover={{ scale: !isOn || unknown || loading ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPumpForCrop(cropKey, "OFF")}
          disabled={!isOn || unknown || loading}
          className="flex-1 py-2.5 text-sm font-bold rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Turn Pump OFF
        </motion.button>
      </div>
    </Card>
  );
}

/* ─── Crop Panel ────────────────────────────────────────────────── */
function CropPanel({ cropKey, meta, aiData }) {
  const { targetMoistures } = useCropControls();
  const nodes = useSensorData();
  const node  = nodes.find((n) => n.id === meta.id) ?? null;
  const data  = aiData ?? MOCK_AI[cropKey] ?? null;
  const targetMoisture = targetMoistures[cropKey];

  return (
    <motion.div
      key={cropKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-40">
        <img
          src={meta.image}
          alt={meta.label}
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.7) brightness(0.85)" }}
          loading="lazy"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${meta.bg} to-transparent`} />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
            Live · Firebase Connected
          </p>
          <div className="flex items-center gap-3">
            <img src={meta.icon} alt={meta.label} className="w-10 h-10 rounded-xl object-cover border-2 border-white/30" />
            <h2 className="text-2xl font-bold text-white leading-none">
              {meta.label} Dashboard
            </h2>
          </div>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-live" />
          <span className="text-[10px] text-white font-semibold">Live</span>
        </div>
      </div>

      {/* Live readings */}
      <LiveSensorStrip node={node} cropColor={meta.color} />

      {/* 2-col: Materials + AI Intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MaterialsCard data={data} />
        <AIIntelligenceCard data={data} cropColor={meta.color} />
      </div>

      {/* Irrigation control */}
      <IrrigationControl cropKey={cropKey} cropColor={meta.color} targetMoisture={targetMoisture} />
    </motion.div>
  );
}

/* ─── AIDashboard ───────────────────────────────────────────────── */
export default function AIDashboard() {
  const [activeCrop, setActiveCrop] = useState("rice");
  const aiDashboard = useAIDashboard();
  const crops = Object.entries(CROP_META);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-accent" />
          <h1 className="text-lg font-bold text-surface-900">AI Dashboard</h1>
          <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider">
            n8n Powered
          </span>
        </div>
        <p className="text-xs text-surface-400">
          Automated crop intelligence — sensor data, weather &amp; crop profiles analysed every 30–60 minutes.
        </p>
      </div>

      {/* Crop tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-5 w-fit">
        {crops.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActiveCrop(key)}
            className="relative flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all"
            style={{
              background: activeCrop === key ? "white" : "transparent",
              color: activeCrop === key ? meta.color : "#9a8c75",
              boxShadow: activeCrop === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <img
              src={meta.icon}
              alt={meta.label}
              className="w-5 h-5 rounded object-cover"
            />
            {meta.label}
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-semantic-green border-2 border-white" />
          </button>
        ))}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <CropPanel
          key={activeCrop}
          cropKey={activeCrop}
          meta={CROP_META[activeCrop]}
          aiData={aiDashboard[activeCrop] ?? null}
        />
      </AnimatePresence>
    </div>
  );
}
