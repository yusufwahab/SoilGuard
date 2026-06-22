import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { useSensorData } from "../data/SensorContext";
import { getFieldById, dismissAlert, startActuation } from "../data/mockSensorData";
import StatusDot from "../components/ui/StatusDot";
import SeverityTag from "../components/ui/SeverityTag";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import Card from "../components/ui/Card";
import Sparkline from "../components/Sparkline";

/* ─── Helpers ──────────────────────────────────────────────────── */

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function computeStress(n) {
  let v = 0;
  if (n.pH < 5.5 || n.pH > 7.5) v += 40;
  if (n.moisture < 20 || n.moisture > 80) v += 35;
  if (n.ec > 2.5) v += 25;
  return Math.min(100, v);
}

function computeCorrosion(n) {
  let v = 0;
  if (n.ec > 2.0) v += 30;
  if (n.pH < 6.0 || n.pH > 8.0) v += 40;
  if (n.moisture > 60) v += 30;
  return Math.min(100, v);
}

function qualLevel(val, type) {
  if (type === "moisture") return val < 20 || val > 80 ? "critical" : val < 30 || val > 70 ? "watch" : "normal";
  if (type === "pH")       return val < 5.0 || val > 8.0 ? "critical" : val < 5.5 || val > 7.5 ? "watch" : "normal";
  if (type === "ec")       return val > 3.0 ? "critical" : val > 2.0 ? "watch" : "normal";
  if (type === "temp")     return val > 40 || val < 15 ? "watch" : "normal";
  return "normal";
}

/* ─── Actuation Modal ──────────────────────────────────────────── */
function ActuationModal({ alert, fieldId, fieldName, onClose }) {
  const [phase, setPhase] = useState("confirm");
  const [progress, setProgress] = useState(0);
  const [secsLeft, setSecsLeft] = useState(5);
  const ivRef = useRef(null);

  function handleConfirm() {
    startActuation(fieldId, alert.actionTank);
    setPhase("sending");
    setTimeout(() => {
      setPhase("running");
      setProgress(0);
      setSecsLeft(5);
      let elapsed = 0;
      ivRef.current = setInterval(() => {
        elapsed += 0.1;
        const pct = Math.min(100, (elapsed / 5) * 100);
        setProgress(pct);
        setSecsLeft(Math.max(0, Math.ceil(5 - elapsed)));
        if (pct >= 100) {
          clearInterval(ivRef.current);
          setPhase("verifying");
          setTimeout(() => setPhase("completed"), 2800);
        }
      }, 100);
    }, 1400);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => { if (phase === "confirm") onClose(); }}
    >
      <motion.div
        className="bg-surface-50 rounded-2xl border border-surface-200 w-full max-w-sm mx-4 p-6 shadow-2xl"
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {phase === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-3">Confirm actuation</p>
              <h3 className="text-base font-bold text-surface-900 mb-1">{alert.actionLabel}</h3>
              <p className="text-sm text-surface-600 mb-1">
                Tank {alert.actionTank} will dispense into{" "}
                <strong className="text-surface-900 font-semibold">{fieldName}</strong>.
              </p>
              <p className="text-xs text-surface-400 leading-relaxed mb-6">{alert.recommendation}</p>
              <div className="flex items-center justify-end gap-3">
                <button className="text-sm text-surface-500 hover:text-surface-900 transition-colors px-3 py-1.5" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                  onClick={handleConfirm}
                >
                  Confirm &amp; Dispense
                </button>
              </div>
            </motion.div>
          )}

          {phase === "sending" && (
            <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
              <p className="text-sm font-medium text-surface-600">Sending command…</p>
              <p className="text-xs text-surface-400 mt-1">Establishing relay connection</p>
            </motion.div>
          )}

          {phase === "running" && (
            <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
              <p className="text-sm font-bold text-surface-900 mb-1">Pump running</p>
              <p className="text-xs text-surface-500 mb-4">
                {secsLeft}s remaining — Tank {alert.actionTank} dispensing
              </p>
              <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[10px] text-surface-400 mt-2">{Math.round(progress)}% complete</p>
            </motion.div>
          )}

          {phase === "verifying" && (
            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
              <p className="text-sm font-medium text-surface-600">Done — verifying with sensor…</p>
              <p className="text-xs text-surface-400 mt-1">Waiting for reading to confirm</p>
            </motion.div>
          )}

          {phase === "completed" && (
            <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-semantic-green mb-3">Correction confirmed</p>
              <p className="text-sm font-bold text-surface-900 mb-1">Sensor reading updated</p>
              <p className="text-xs text-surface-500 leading-relaxed">
                Sensor confirmed the change. Monitor the field over the next few minutes to verify the trend stabilises.
              </p>
              <div className="flex justify-end mt-5">
                <button className="px-4 py-2 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors" onClick={onClose}>
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─── FieldDetail ──────────────────────────────────────────────── */
export default function FieldDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  useSensorData();
  const node = getFieldById(id);

  const [timeRange, setTimeRange] = useState(1);
  const [chartLines, setChartLines] = useState({ moisture: true, pH: true, ec: true, temperature: false });
  const [actuationAlert, setActuationAlert] = useState(null);

  const history = node?.history ?? [];
  const filteredHistory = useMemo(() => {
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000;
    return history.filter((h) => h.t >= cutoff);
  }, [history, timeRange]);

  const linesConfig = {
    moisture:    { color: "#0284c7", label: "Moisture" },
    pH:          { color: "#16a34a", label: "pH" },
    ec:          { color: "#d97706", label: "EC" },
    temperature: { color: "#dc2626", label: "Temp" },
  };

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-sm text-surface-500 mb-3">Field not found.</p>
        <button className="text-sm text-accent hover:underline" onClick={() => navigate("/app")}>Back to Overview</button>
      </div>
    );
  }

  const stress = computeStress(node);
  const corrosion = computeCorrosion(node);
  const activeAlert = node.alerts[0] ?? null;
  const connLabel = node.connectivity === "live" ? "Live" : node.connectivity === "buffered" ? "Buffered" : "Offline";
  const lsi = (node.pH - 7.5 + node.ec * 0.1).toFixed(2);
  const serviceMos = Math.max(1, Math.round(60 - corrosion * 0.55));

  return (
    <motion.div
      className="max-w-5xl space-y-5 pb-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-bold text-surface-900 truncate">{node.name}</h2>
          <span className="shrink-0 text-[11px] font-semibold bg-surface-200 text-surface-600 px-2 py-0.5 rounded">
            {node.crop}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-surface-500 shrink-0">
            <StatusDot status={node.connectivity} />
            <span>updated {timeAgo(node.lastSeen)}</span>
          </div>
        </div>
        <button className="shrink-0 text-xs text-surface-400 hover:text-surface-700 px-2 py-1 rounded hover:bg-surface-100 transition-colors">
          &bull;&bull;&bull;
        </button>
      </div>

      {/* ── Hardware health strip ── */}
      <div className="bg-surface-100/70 border border-surface-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-surface-600">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-surface-900 tabular-nums">{node.battery.toFixed(0)}%</span>
          <span>Battery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${node.solarCharging ? "bg-semantic-amber" : "bg-surface-300"}`} />
          <span>{node.solarCharging ? "Solar charging" : "Not charging"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={node.connectivity} className="shrink-0" />
          <span>{connLabel}</span>
        </div>
        <span className="ml-auto text-surface-400 font-mono text-[11px]">{node.id}</span>
      </div>

      {/* ── Live readings row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Soil Moisture", val: node.moisture, unit: "%",    key: "moisture", color: "#0284c7", type: "moisture", dec: 1 },
          { label: "Soil pH",       val: node.pH,        unit: "",     key: "pH",       color: "#16a34a", type: "pH",       dec: 1 },
          { label: "EC",            val: node.ec,        unit: " dS/m",key: "ec",       color: "#d97706", type: "ec",       dec: 2 },
          { label: "Temperature",   val: node.temperature,unit: "°C",  key: "temperature",color:"#dc2626",type: "temp",     dec: 1 },
        ].map(({ label, val, unit, key, color, type, dec }) => (
          <Card key={key} className="overflow-hidden">
            <div className="flex items-start justify-between mb-1">
              <p className="font-mono text-3xl font-bold tabular-nums leading-none text-surface-900">
                <AnimatedNumber value={val} decimals={dec} />
                <span className="text-lg font-normal text-surface-400 ml-0.5">{unit}</span>
              </p>
              <SeverityTag level={qualLevel(val, type)} />
            </div>
            <p className="text-xs text-surface-500 mb-2">{label}</p>
            <Sparkline data={node.history.slice(-25)} dataKey={key} color={color} />
          </Card>
        ))}
      </div>

      {/* ── Dual prediction ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crop Stress */}
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-4">Crop Stress Predictor</p>
          {stress > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-mono text-4xl font-bold tabular-nums text-surface-900">
                  {activeAlert?.daysToImpact ?? "—"}
                </span>
                <span className="text-sm text-surface-500">days to impact</span>
              </div>
              <p className="text-sm text-surface-600 leading-relaxed mb-4">
                {activeAlert?.detail ?? "Conditions are trending toward a stress threshold."}
              </p>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={node.history.slice(-40)}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e9e4db" vertical={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[4.5, 8.5]} hide />
                    <ReferenceLine y={5.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
                    <ReferenceLine y={7.5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
                    <Line type="monotone" dataKey="pH" stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-surface-400 mt-2">pH trend — amber lines mark safe range (5.5–7.5)</p>
            </>
          ) : (
            <p className="text-sm text-surface-400 py-8">All conditions within normal range.</p>
          )}
        </Card>

        {/* Corrosion Index */}
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-4">Corrosion Index</p>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className={`font-mono text-4xl font-bold tabular-nums ${
              corrosion > 66 ? "text-semantic-red" : corrosion > 33 ? "text-semantic-amber" : "text-semantic-green"
            }`}>
              {corrosion}%
            </span>
            <span className="text-sm text-surface-500">severity</span>
          </div>
          <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden mb-5">
            <motion.div
              className={`h-full rounded-full ${corrosion > 66 ? "bg-semantic-red" : corrosion > 33 ? "bg-semantic-amber" : "bg-semantic-green"}`}
              animate={{ width: `${corrosion}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-2xl font-bold tabular-nums text-surface-900">{serviceMos}</span>
            <span className="text-sm text-surface-500">months est. service life</span>
          </div>
          <p className="text-xs text-surface-400 mt-3 leading-relaxed">
            LSI: {lsi} &middot; EC {node.ec.toFixed(2)} dS/m is the primary driver
          </p>
        </Card>
      </div>

      {/* ── Historical chart ── */}
      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-4 flex-wrap">
            {Object.entries(linesConfig).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setChartLines((p) => ({ ...p, [key]: !p[key] }))}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  chartLines[key] ? "text-surface-900" : "text-surface-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-surface-100 rounded-lg p-0.5">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  timeRange === d ? "bg-surface-50 text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
                }`}
                onClick={() => setTimeRange(d)}
              >
                {d === 1 ? "24h" : d === 7 ? "7d" : "30d"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 6" stroke="#e9e4db" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                tick={{ fontSize: 10, fill: "#b8ad99" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#b8ad99" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#faf8f5", border: "1px solid #e9e4db", borderRadius: "8px", fontSize: "11px", color: "#3a3429" }}
              />
              {Object.entries(linesConfig).map(([key, cfg]) =>
                chartLines[key] ? (
                  <Line key={key} type="monotone" dataKey={key} stroke={cfg.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Prescription card ── */}
      {activeAlert ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-50 border border-surface-200 rounded-xl p-5"
          style={{ borderLeft: "3px solid #f59e0b" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-semantic-amber mb-3">
            {activeAlert.type === "corrosion" ? "Corrosion alert" : "Crop stress alert"}
          </p>
          <h3 className="text-base font-bold text-surface-900 mb-2">{activeAlert.headline}</h3>
          <p className="text-sm text-surface-600 leading-relaxed mb-4">{activeAlert.recommendation}</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {activeAlert.reasoning?.map((r, i) => (
              <span key={i} className="text-[11px] bg-surface-100 text-surface-500 px-2.5 py-1 rounded-md">{r}</span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {activeAlert.actionable && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                onClick={() => setActuationAlert(activeAlert)}
              >
                {activeAlert.actionLabel}
              </motion.button>
            )}
            <button className="text-sm text-surface-400 hover:text-surface-700 transition-colors" onClick={() => dismissAlert(node.id, activeAlert.id)}>
              Dismiss
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-surface-400">All conditions normal</p>
          <p className="text-xs text-surface-300 mt-1">No active alerts for this field.</p>
        </div>
      )}

      {/* ── Actuation modal ── */}
      <AnimatePresence>
        {actuationAlert && (
          <ActuationModal
            alert={actuationAlert}
            fieldId={node.id}
            fieldName={node.name}
            onClose={() => setActuationAlert(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
