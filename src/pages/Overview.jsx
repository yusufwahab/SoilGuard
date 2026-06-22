import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSensorData } from "../data/SensorContext";
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
      <Card className="relative h-full hover:border-surface-300 hover:shadow-sm transition-shadow duration-150">
        {/* Action needed */}
        {hasAlert && (
          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-semantic-amber">
            Action needed
          </span>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pr-24">
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
      </Card>
    </motion.div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */
export default function Overview() {
  const nodes = useSensorData();

  const totalFields   = nodes.length;
  const activeAlerts  = nodes.reduce((s, n) => s + n.alerts.length, 0);
  const onlineCount   = nodes.filter((n) => n.connectivity === "live").length;
  const avgCorrosion  = totalFields
    ? Math.round(nodes.reduce((s, n) => s + computeCorrosion(n), 0) / totalFields)
    : 0;

  return (
    <div className="max-w-6xl">
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

      {/* Field grid */}
      {nodes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <p className="text-sm font-medium text-surface-500 mb-1">No fields yet</p>
          <p className="text-xs text-surface-400 mb-5">Set up a sensing node to start monitoring.</p>
          <button className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors">
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
