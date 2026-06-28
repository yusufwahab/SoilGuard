import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSensorData, useCropControls } from "../data/SensorContext";
import StatusDot from "../components/ui/StatusDot";
import StatBlock from "../components/ui/StatBlock";
import Card from "../components/ui/Card";

/* ─── Helpers ──────────────────────────────────────────────────── */

function computeStress(n) {
  let s = 0;
  if (n.pH < 5.5 || n.pH > 7.5) s += 40;
  if (n.moisture < 20 || n.moisture > 80) s += 35;
  if (n.ec > 2.5) s += 25;
  return Math.min(100, s);
}

function computeCorrosion(n) {
  let s = 0;
  if (n.ec > 2.0) s += 30;
  if (n.pH < 6.0 || n.pH > 8.0) s += 40;
  if (n.moisture > 60) s += 30;
  return Math.min(100, s);
}

function severityBg(val) {
  if (val > 66) return "bg-semantic-red";
  if (val > 33) return "bg-semantic-amber";
  return "bg-semantic-green";
}

function severityText(val) {
  if (val > 66) return "text-semantic-red";
  if (val > 33) return "text-semantic-amber";
  return "text-semantic-green";
}

/* ─── Crop images ──────────────────────────────────────────────── */
const CROP_IMAGES = {
  Rice:    "/Rice.jpg",
  Beans:   "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=400&q=70",
  Yam:     "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=400&q=70",
  Maize:   "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=400&q=70",
  Cassava: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=400&q=70",
};

/* ─── Risk bar ─────────────────────────────────────────────────── */
function RiskBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-surface-500">{label}</span>
        <span className={`text-[10px] font-semibold tabular-nums ${severityText(value)}`}>
          {value}%
        </span>
      </div>
      <div className="h-1 w-full bg-surface-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${severityBg(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ─── Field card ───────────────────────────────────────────────── */
function FieldCard({ node, index }) {
  const navigate = useNavigate();
  const stress = computeStress(node);
  const corrosion = computeCorrosion(node);
  const hasAlert = node.alerts.length > 0;

  const connLabel =
    node.connectivity === "live" ? "Live" :
    node.connectivity === "buffered" ? "Buffered" : "Offline";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.065, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      className="cursor-pointer"
      onClick={() => navigate(`/app/fields/${node.id}`)}
    >
      <Card className="relative h-full hover:border-surface-300 hover:shadow-sm transition-shadow duration-150 overflow-hidden" padding="none">
        {/* Crop image thumbnail */}
        <div className="relative h-24 overflow-hidden">
          <img
            src={CROP_IMAGES[node.crop] ?? "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=70"}
            alt={node.crop}
            className="w-full h-full object-cover"
            style={{ filter: "saturate(0.65) brightness(0.92)" }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-50/90 to-transparent" />
          {hasAlert && (
            <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-semantic-amber bg-white/80 px-1.5 py-0.5 rounded">
              Action needed
            </span>
          )}
        </div>

        <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pr-2">
          <StatusDot status={node.connectivity} />
          <span className="text-sm font-semibold text-surface-900 truncate">{node.name}</span>
          <span className="text-xs text-surface-400 shrink-0">{node.crop}</span>
        </div>

        {/* Mini readings */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "H₂O", val: `${node.moisture.toFixed(1)}%` },
            { label: "pH",   val: node.pH.toFixed(1) },
            { label: "EC",   val: node.ec.toFixed(2) },
            { label: "Temp", val: `${node.temperature.toFixed(1)}°` },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="font-mono text-sm font-semibold tabular-nums text-surface-900 leading-none mb-0.5">
                {val}
              </p>
              <p className="text-[10px] text-surface-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Risk bars */}
        <div className="space-y-2.5 pt-3 border-t border-surface-100">
          <RiskBar label="Crop Stress" value={stress} />
          <RiskBar label="Corrosion Risk" value={corrosion} />
        </div>

        {/* Footer */}
        <p className="text-[10px] text-surface-400 mt-3">
          {connLabel} &middot; {node.id}
        </p>
        </div>
      </Card>
    </motion.div>
  );
}

/* ─── Sustainability Strip ─────────────────────────────────────── */
function SustainabilityStrip() {
  const { totalCycles, waterSavedL, autopilotCount, realNodes } = useCropControls();
  const hasRealDevices = Object.values(realNodes).some(Boolean);
  if (!hasRealDevices) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-surface-200 bg-surface-100/50 px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-2"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mr-2 shrink-0">
        Session impact
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm font-bold tabular-nums text-semantic-green">{waterSavedL} L</span>
        <span className="text-xs text-surface-500">water saved vs manual irrigation</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm font-bold tabular-nums text-surface-900">{totalCycles}</span>
        <span className="text-xs text-surface-500">precision irrigation {totalCycles === 1 ? "cycle" : "cycles"}</span>
      </div>
      {autopilotCount > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping-live" />
          <span className="text-xs font-semibold text-accent">
            {autopilotCount} {autopilotCount === 1 ? "field" : "fields"} on autopilot
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */
export default function Overview() {
  const nodes = useSensorData();
  const navigate = useNavigate();

  const totalFields   = nodes.length;
  const activeAlerts  = nodes.reduce((s, n) => s + n.alerts.length, 0);
  const onlineCount   = nodes.filter((n) => n.connectivity === "live").length;
  const avgCorrosion  = totalFields
    ? Math.round(nodes.reduce((s, n) => s + computeCorrosion(n), 0) / totalFields)
    : 0;

  return (
    <div className="max-w-6xl">
      {/* Farm header image */}
      <div className="relative rounded-2xl overflow-hidden h-36 mb-6">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1400&q=80"
          alt="Farm overview"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.6) brightness(0.9)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-900/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Farm Overview</p>
          <h2 className="text-xl font-bold text-white">All Fields — SoilGuard</h2>
        </div>
      </div>

      {/* Summary stats */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card tinted padding="md">
          <StatBlock label="Fields monitored" value={totalFields} />
        </Card>
        <Card tinted padding="md">
          <StatBlock
            label="Active alerts"
            value={activeAlerts}
            sub={activeAlerts > 0 ? "Need attention" : "All clear"}
            valueColor={activeAlerts > 0 ? "text-semantic-amber" : undefined}
          />
        </Card>
        <Card tinted padding="md">
          <StatBlock label="Avg corrosion risk" value={`${avgCorrosion}%`} />
        </Card>
        <Card tinted padding="md">
          <StatBlock
            label="Nodes online"
            value={`${onlineCount}/${totalFields}`}
            valueColor={
              onlineCount < totalFields
                ? onlineCount === 0 ? "text-semantic-red" : "text-semantic-amber"
                : undefined
            }
          />
        </Card>
      </motion.div>

      {/* Sustainability strip — only shown when a real device is connected */}
      <SustainabilityStrip />

      {/* Field grid */}
      {nodes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <p className="text-sm font-medium text-surface-500 mb-1">No fields yet</p>
          <p className="text-xs text-surface-400 mb-5">Set up a sensing node to start monitoring.</p>
          <button
            onClick={() => navigate("/onboarding")}
            className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            Add your first field
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {nodes.map((node, i) => (
            <FieldCard key={node.id} node={node} index={i} />
          ))}

          {/* Ghost add-field card */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: nodes.length * 0.065 + 0.1 }}
            onClick={() => navigate("/onboarding")}
            className="rounded-xl border-2 border-dashed border-surface-200 p-4 flex flex-col items-center justify-center text-surface-400 hover:text-surface-600 hover:border-surface-300 transition-colors min-h-50 gap-2"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs font-medium">Add field</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
