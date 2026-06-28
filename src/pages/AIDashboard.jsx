import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, AlertTriangle, Leaf, Droplets, FlaskConical, ShieldAlert } from "lucide-react";
import { useAIDashboard, usePumpControl } from "../data/SensorContext";
import Card from "../components/ui/Card";

/* ─── Unsplash images per crop ─────────────────────────────────── */
const CROP_META = {
  rice: {
    label: "Rice",
    color: "#16a34a",
    bg: "from-green-900/80",
    image: "https://images.unsplash.com/photo-1536304993881-ff86e0c9b96f?auto=format&fit=crop&w=1200&q=80",
    icon: "🌾",
    pumpCrop: true, // has real device
  },
  beans: {
    label: "Beans",
    color: "#d97706",
    bg: "from-amber-900/80",
    image: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1200&q=80",
    icon: "🫘",
    pumpCrop: false,
  },
  yam: {
    label: "Yam",
    color: "#7c3aed",
    bg: "from-purple-900/80",
    image: "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&w=1200&q=80",
    icon: "🍠",
    pumpCrop: false,
  },
};

/* ─── Mock AI data for beans & yam (real data comes from Firebase for rice) */
const MOCK_AI = {
  beans: {
    farmer_message: "Soil moisture is stable at 52%. No irrigation needed today. Monitor for bean rust given the recent humidity spike. Recommend foliar spray of copper-based fungicide within 48 hours.",
    recommended_target: 55,
    fungi_risk_score: 7,
    fungi_advice: "Moderate-High risk. Humidity above 75% detected for 3 consecutive days. Apply preventative fungicide.",
    material_health_status: "Warning: EC reading at 2.8 dS/m — elevated salinity stress on metallic sensor probes. Schedule probe cleaning within 2 weeks.",
  },
  yam: {
    farmer_message: "pH is optimal at 6.2. Tuber development stage detected — reduce irrigation frequency to every 3 days to prevent waterlogging and tuber rot.",
    recommended_target: 45,
    fungi_risk_score: 2,
    fungi_advice: "Low risk. Conditions are dry and well-ventilated. No action required.",
    material_health_status: "OK: Soil chemistry is within safe corrosion thresholds. LSI index is neutral. Sensor probes are healthy.",
  },
};

/* ─── Fungi Risk Meter ──────────────────────────────────────────── */
function FungiRiskMeter({ score }) {
  const pct = ((score ?? 0) / 10) * 100;
  const color =
    score >= 7 ? "#ef4444" : score >= 4 ? "#f59e0b" : "#22c55e";
  const label =
    score >= 7 ? "High Risk" : score >= 4 ? "Moderate Risk" : "Low Risk";

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical size={15} className="text-surface-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
          Fungi Risk Meter
        </p>
      </div>
      <div className="flex items-end gap-4 mb-3">
        <span
          className="font-mono text-5xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {score ?? "—"}
        </span>
        <div className="pb-1">
          <span className="text-xs text-surface-400">/ 10</span>
          <p className="text-xs font-semibold mt-0.5" style={{ color }}>
            {label}
          </p>
        </div>
      </div>

      {/* Bar */}
      <div className="h-3 w-full bg-surface-200 rounded-full overflow-hidden mb-2 relative">
        {/* Gradient track */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: "linear-gradient(to right, #22c55e, #f59e0b, #ef4444)",
          }}
        />
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[9px] text-surface-400 font-mono mb-3">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>

      {/* Segment dots */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all"
            style={{
              background: i < (score ?? 0) ? color : "#e9e4db",
              color: i < (score ?? 0) ? "white" : "#9a8c75",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Material Health Alert ─────────────────────────────────────── */
function MaterialHealthAlert({ status }) {
  const isOK =
    typeof status === "string" && status.toLowerCase().startsWith("ok");
  const isWarning =
    typeof status === "string" && status.toLowerCase().startsWith("warning");

  return (
    <Card className="overflow-hidden">
      {/* MME Banner */}
      <div
        className="flex items-center gap-2 -mx-4 -mt-4 px-4 py-2 mb-4"
        style={{
          background: isOK
            ? "linear-gradient(135deg, #16a34a15, #dcfce7)"
            : isWarning
            ? "linear-gradient(135deg, #f59e0b15, #fef3c7)"
            : "linear-gradient(135deg, #ef444415, #fee2e2)",
          borderBottom: `2px solid ${isOK ? "#22c55e" : isWarning ? "#f59e0b" : "#ef4444"}`,
        }}
      >
        <ShieldAlert
          size={14}
          style={{ color: isOK ? "#16a34a" : isWarning ? "#d97706" : "#ef4444" }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isOK ? "#16a34a" : isWarning ? "#d97706" : "#ef4444" }}
        >
          Materials &amp; Metallurgical Health
        </p>
        <span
          className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isOK ? "#dcfce7" : isWarning ? "#fef9c3" : "#fee2e2",
            color: isOK ? "#16a34a" : isWarning ? "#d97706" : "#ef4444",
          }}
        >
          {isOK ? "SAFE" : isWarning ? "WARNING" : "CRITICAL"}
        </span>
      </div>

      {/* Sensor probe image */}
      <div className="rounded-xl overflow-hidden mb-4 h-32 relative">
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80"
          alt="Metallic sensor probe"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.6) brightness(0.9)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent" />
        <p className="absolute bottom-2 left-3 text-[10px] text-white/80 font-medium">
          Galvanic corrosion risk — sensor probe integrity
        </p>
      </div>

      <div
        className="rounded-xl p-4 border"
        style={{
          borderColor: isOK ? "#22c55e40" : isWarning ? "#f59e0b40" : "#ef444440",
          background: isOK ? "#f0fdf440" : isWarning ? "#fffbeb40" : "#fff1f240",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0"
            style={{ color: isOK ? "#16a34a" : isWarning ? "#d97706" : "#ef4444" }}
          />
          <p className="text-sm text-surface-700 leading-relaxed font-medium">
            {status ?? "Awaiting AI analysis…"}
          </p>
        </div>
      </div>

      {/* MME relevance note */}
      <div className="mt-3 pt-3 border-t border-surface-100">
        <p className="text-[10px] text-surface-400 leading-relaxed">
          <span className="font-semibold text-surface-500">MME Dept. relevance:</span> Real-time galvanic
          corrosion prediction on buried metallic infrastructure driven by live soil EC, pH, and moisture data.
        </p>
      </div>
    </Card>
  );
}

/* ─── AI Advisor Message Board ──────────────────────────────────── */
function AIAdvisorBoard({ message, recommendedTarget, cropColor, isLoading }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Brain size={15} style={{ color: cropColor }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
          AI Advisor — n8n Analysis
        </p>
        {isLoading && (
          <span className="ml-auto text-[9px] text-surface-400 animate-pulse">
            Waiting for report…
          </span>
        )}
      </div>

      <div
        className="rounded-xl p-4 border mb-4"
        style={{
          borderLeft: `3px solid ${cropColor}`,
          background: "linear-gradient(135deg, #faf8f5, #f5f2ed)",
        }}
      >
        <p className="text-sm text-surface-700 leading-relaxed">
          {message ?? "No AI report received yet. n8n will push the next analysis in 30–60 minutes."}
        </p>
      </div>

      {recommendedTarget !== undefined && recommendedTarget !== null && (
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-surface-400 uppercase tracking-wider mb-1">
              Recommended Irrigation Target
            </p>
            <div className="flex items-center gap-2">
              <Droplets size={14} style={{ color: cropColor }} />
              <span
                className="font-mono text-2xl font-bold tabular-nums"
                style={{ color: cropColor }}
              >
                {recommendedTarget}%
              </span>
              <span className="text-xs text-surface-400">soil moisture</span>
            </div>
          </div>
          <div className="flex-1 ml-2">
            <div className="h-2.5 w-full bg-surface-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cropColor }}
                initial={{ width: 0 }}
                animate={{ width: `${recommendedTarget}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Pump Control (shared, mocked for non-rice crops) ──────────── */
function PumpControlWidget({ cropKey, cropColor, isReal }) {
  const { pumpState, pumpLoading, setPump } = usePumpControl();
  const [mockState, setMockState] = useState("OFF");

  const state = isReal ? pumpState : mockState;
  const isOn = state === "ON";
  const unknown = isReal && state === null;

  function handleSet(s) {
    if (isReal) {
      setPump(s);
    } else {
      setMockState(s);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-2">
            Manual Pump Control{!isReal && " — Simulated"}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: isOn ? cropColor : "#d6cec0",
                boxShadow: isOn ? `0 0 0 3px ${cropColor}30` : "none",
              }}
            />
            <span className="text-sm font-bold text-surface-900">
              {unknown ? "Connecting…" : isOn ? "Pump running" : "Pump stopped"}
            </span>
            {pumpLoading && isReal && (
              <span className="text-xs text-surface-400 ml-1">Sending…</span>
            )}
          </div>
          <p className="text-xs text-surface-500">
            {isOn
              ? "Pump is dispensing water to the field."
              : "Pump is idle. Activate to irrigate."}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: isOn || unknown ? 1 : 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSet("ON")}
            disabled={isOn || unknown || (isReal && pumpLoading)}
            className="px-5 py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: cropColor }}
          >
            {isOn ? "● Running" : "Turn ON"}
          </motion.button>
          <motion.button
            whileHover={{ scale: !isOn || unknown ? 1 : 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSet("OFF")}
            disabled={!isOn || unknown || (isReal && pumpLoading)}
            className="px-5 py-2 text-sm font-bold rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Turn OFF
          </motion.button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Fungi Advice Card ──────────────────────────────────────────── */
function FungiAdviceCard({ advice, cropColor }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Leaf size={15} className="text-surface-400" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
          Fungi Advisory
        </p>
      </div>
      <div className="rounded-xl overflow-hidden mb-3 h-28">
        <img
          src="https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=800&q=80"
          alt="Fungi on crop leaves"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.7) brightness(0.95)" }}
          loading="lazy"
        />
      </div>
      <p className="text-sm text-surface-700 leading-relaxed">
        {advice ?? "Awaiting fungi risk assessment…"}
      </p>
    </Card>
  );
}

/* ─── Crop Tab Panel ────────────────────────────────────────────── */
function CropPanel({ cropKey, meta, aiData }) {
  const isLive = cropKey === "rice";
  const data = aiData ?? MOCK_AI[cropKey] ?? null;

  return (
    <motion.div
      key={cropKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Crop hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-44">
        <img
          src={meta.image}
          alt={`${meta.label} field`}
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.75) brightness(0.9)" }}
          loading="lazy"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-r ${meta.bg} to-transparent`}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
            {isLive ? "Live · Firebase Connected" : "Simulated · Mock Data"}
          </p>
          <h2 className="text-2xl font-bold text-white leading-none">
            {meta.icon} {meta.label} AI Dashboard
          </h2>
          <p className="text-sm text-white/70 mt-1">
            n8n master loop — analysis pushed every 30–60 min
          </p>
        </div>
        {isLive && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping-live" />
            <span className="text-[10px] text-white font-semibold">Live</span>
          </div>
        )}
      </div>

      {/* AI Advisor */}
      <AIAdvisorBoard
        message={data?.farmer_message}
        recommendedTarget={data?.recommended_target}
        cropColor={meta.color}
        isLoading={isLive && !data}
      />

      {/* Fungi Risk + Advice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FungiRiskMeter score={data?.fungi_risk_score} />
        <FungiAdviceCard advice={data?.fungi_advice} cropColor={meta.color} />
      </div>

      {/* Material Health Alert */}
      <MaterialHealthAlert status={data?.material_health_status} />

      {/* Pump Control */}
      <PumpControlWidget
        cropKey={cropKey}
        cropColor={meta.color}
        isReal={meta.pumpCrop}
      />
    </motion.div>
  );
}

/* ─── AIDashboard ───────────────────────────────────────────────── */
export default function AIDashboard() {
  const [activeCrop, setActiveCrop] = useState("rice");
  const aiDashboard = useAIDashboard();

  const crops = Object.entries(CROP_META);

  return (
    <div className="max-w-4xl">
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
          Automated crop intelligence — weather, sensor data &amp; crop profiles analysed every 30–60 minutes.
        </p>
      </div>

      {/* Crop tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-5 w-fit">
        {crops.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setActiveCrop(key)}
            className="relative px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={{
              background: activeCrop === key ? "white" : "transparent",
              color: activeCrop === key ? meta.color : "#9a8c75",
              boxShadow: activeCrop === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {meta.icon} {meta.label}
            {key === "rice" && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-semantic-green border-2 border-white" />
            )}
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
