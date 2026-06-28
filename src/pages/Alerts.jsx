import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSensorData } from "../data/SensorContext";
import { dismissAlert } from "../data/mockSensorData";
import Card from "../components/ui/Card";

/* ─── Helpers ──────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const styles = {
    active:    "text-semantic-amber bg-semantic-amber/10",
    resolved:  "text-semantic-green bg-semantic-green/10",
    dismissed: "text-surface-400 bg-surface-100",
  };
  return (
    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${styles[status] ?? styles.dismissed}`}>
      {status}
    </span>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
        active ? "bg-surface-200 text-surface-900" : "text-surface-500 hover:text-surface-800 hover:bg-surface-100"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Live sensor readings panel (real device only) ────────────── */
function LiveReadingsPanel({ node }) {
  const isLive = node.connectivity === "live";

  const readings = [
    { label: "Temperature", value: node.temperature?.toFixed(1), unit: "°C",   color: "text-semantic-red" },
    { label: "Humidity",    value: node.humidity?.toFixed(1),    unit: "%",    color: "text-[#7c3aed]" },
    { label: "Moisture",    value: node.moisture?.toFixed(1),    unit: "%",    color: "text-[#0284c7]" },
    { label: "pH",          value: node.pH?.toFixed(2),          unit: "",     color: "text-[#16a34a]" },
    { label: "EC",          value: node.ec?.toFixed(2),          unit: "dS/m", color: "text-[#d97706]" },
    { label: "Pump",        value: node.pumpStatus === 1 ? "ON" : "OFF", unit: "", color: node.pumpStatus === 1 ? "text-semantic-green" : "text-surface-400" },
  ];

  return (
    <Card className="mb-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">
            Live Readings — {node.name}
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            isLive ? "text-semantic-green bg-semantic-green/10" : "text-semantic-red bg-semantic-red/10"
          }`}>
            {isLive ? "● Live" : "○ Offline"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-surface-400">
          {isLive ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="text-[10px] font-mono">{node.id}</span>
        </div>
      </div>

      {/* Readings grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {readings.map(({ label, value, unit, color }) => (
          <div key={label} className="flex flex-col">
            <span className={`font-mono text-lg font-bold tabular-nums leading-none ${color}`}>
              {value ?? "—"}
              {unit && <span className="text-xs font-normal text-surface-400 ml-0.5">{unit}</span>}
            </span>
            <span className="text-[10px] text-surface-400 mt-1">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-surface-300 mt-3 font-mono">
        Last seen: {new Date(node.lastSeen).toLocaleTimeString()} · Polling every 3s
      </p>
    </Card>
  );
}

/* ─── Alerts ───────────────────────────────────────────────────── */
export default function Alerts() {
  const nodes = useSensorData();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [filterField, setFilterField] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Real device node for live readings panel
  const riceNode = nodes.find((n) => n.isRealDevice) ?? null;

  const allAlerts = useMemo(() => {
    const list = [];
    nodes.forEach((n) =>
      n.alerts.forEach((a) => list.push({ ...a, fieldName: n.name }))
    );
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [nodes]);

  const filtered = useMemo(() => {
    return allAlerts.filter((a) => {
      if (filterField !== "all" && a.fieldId !== filterField) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterType === "crop_stress" && a.type !== "crop_stress") return false;
      if (filterType === "corrosion" && a.type !== "corrosion") return false;
      return true;
    });
  }, [allAlerts, filterField, filterStatus, filterType]);

  // ── Console logging ─────────────────────────────────────────────
  useEffect(() => {
    if (!riceNode) return;
    console.log(
      "%c[Alerts] live sensor snapshot",
      "color:#16a34a;font-weight:bold",
      new Date().toLocaleTimeString(),
      {
        temperature: riceNode.temperature,
        humidity:    riceNode.humidity,
        moisture:    riceNode.moisture,
        pH:          riceNode.pH,
        EC:          riceNode.ec,
        pumpStatus:  riceNode.pumpStatus,
        connectivity:riceNode.connectivity,
      }
    );
  }, [riceNode]);

  useEffect(() => {
    console.log(
      "%c[Alerts] alert list updated",
      "color:#d97706;font-weight:bold",
      `${allAlerts.length} total, ${allAlerts.filter((a) => a.status === "active").length} active`,
      allAlerts
    );
  }, [allAlerts]);

  const activeCount = allAlerts.filter((a) => a.status === "active").length;

  return (
    <motion.div
      className="max-w-4xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden h-32 mb-5">
        <img
          src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1200&q=80"
          alt="Field alerts"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.5) brightness(0.85)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-900/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Alert Centre</p>
          <h2 className="text-xl font-bold text-white">Active &amp; Historical Alerts</h2>
        </div>
      </div>

      {/* ── Live readings panel ── */}
      {riceNode && <LiveReadingsPanel node={riceNode} />}

      {/* ── Header ── */}
      <div className="mb-5">
        <p className="text-xs text-surface-400">
          {activeCount > 0 ? (
            <span className="text-semantic-amber font-semibold">{activeCount} active</span>
          ) : (
            <span className="text-semantic-green font-semibold">All clear</span>
          )}
          {" — "}
          {allAlerts.length} total
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto pb-1">
        <select
          className="shrink-0 text-xs bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-surface-600 focus:outline-none focus:border-surface-400 transition-colors"
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
        >
          <option value="all">All fields</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {[
            { val: "all",      label: "All" },
            { val: "active",   label: "Active" },
            { val: "resolved", label: "Resolved" },
          ].map((s) => (
            <FilterPill key={s.val} active={filterStatus === s.val} onClick={() => setFilterStatus(s.val)}>
              {s.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex gap-1">
          {[
            { val: "all",         label: "All types" },
            { val: "crop_stress", label: "Crop stress" },
            { val: "corrosion",   label: "Corrosion" },
          ].map((t) => (
            <FilterPill key={t.val} active={filterType === t.val} onClick={() => setFilterType(t.val)}>
              {t.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* ── Alert list ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-surface-400">No alerts match your filters.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((alert, i) => {
            const isOpen = expandedId === alert.id;
            const node = nodes.find((n) => n.id === alert.fieldId);
            const dateStr = new Date(alert.createdAt).toLocaleString(undefined, {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card padding="none" className="overflow-hidden">
                  {/* ── Alert row ── */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    onClick={() => setExpandedId(isOpen ? null : alert.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-surface-300 shrink-0">
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </span>

                    {/* Mobile */}
                    <div className="flex-1 min-w-0 sm:hidden">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-surface-900 truncate">{alert.fieldName}</span>
                        <StatusPill status={alert.status} />
                      </div>
                      <span className="text-xs text-surface-500 truncate block">{alert.headline}</span>
                      <span className="text-[10px] text-surface-400 mt-0.5 block">{dateStr}</span>
                    </div>

                    {/* Desktop */}
                    <span className="hidden sm:inline text-xs text-surface-400 shrink-0 w-32">{dateStr}</span>
                    <span className="hidden sm:inline text-sm font-semibold text-surface-900 shrink-0 w-28 truncate">{alert.fieldName}</span>
                    <span className="hidden sm:inline text-sm text-surface-600 flex-1 truncate">{alert.headline}</span>
                    <StatusPill status={alert.status} />
                  </button>

                  {/* ── Expanded detail ── */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-surface-100">
                          <p className="text-sm text-surface-600 leading-relaxed mb-3">
                            {alert.recommendation}
                          </p>

                          {/* Live readings inline (real device alerts) */}
                          {node?.isRealDevice && (
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 p-3 bg-surface-100/60 rounded-lg border border-surface-200">
                              {[
                                { label: "Temp",     value: node.temperature?.toFixed(1), unit: "°C" },
                                { label: "Humidity", value: node.humidity?.toFixed(1),    unit: "%" },
                                { label: "Moisture", value: node.moisture?.toFixed(1),    unit: "%" },
                                { label: "pH",       value: node.pH?.toFixed(2),          unit: "" },
                                { label: "EC",       value: node.ec?.toFixed(2),          unit: "dS/m" },
                                { label: "Pump",     value: node.pumpStatus === 1 ? "ON" : "OFF", unit: "" },
                              ].map(({ label, value, unit }) => (
                                <div key={label}>
                                  <p className="font-mono text-sm font-bold tabular-nums text-surface-900 leading-none">
                                    {value ?? "—"}<span className="text-[10px] font-normal text-surface-400 ml-0.5">{unit}</span>
                                  </p>
                                  <p className="text-[10px] text-surface-400 mt-0.5">{label}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {alert.reasoning?.map((r, idx) => (
                              <span key={idx} className="text-[11px] bg-surface-100 text-surface-500 px-2.5 py-1 rounded-md">
                                {r}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {alert.status === "active" && (
                              <>
                                {alert.actionable && (
                                  node?.isRealDevice ? (
                                    <button
                                      className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/app/fields/${alert.fieldId}`); }}
                                    >
                                      Go to pump control
                                    </button>
                                  ) : (
                                    <button className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                                      {alert.actionLabel}
                                    </button>
                                  )
                                )}
                                <button
                                  className="text-xs text-surface-400 hover:text-surface-700 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.fieldId, alert.id); }}
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                            {alert.status === "resolved" && (
                              <span className="text-xs text-surface-400">Resolved — confirmed by sensor</span>
                            )}
                            {alert.status === "dismissed" && (
                              <span className="text-xs text-surface-400">Dismissed manually</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
