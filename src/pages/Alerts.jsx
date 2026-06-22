import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSensorData } from "../data/SensorContext";
import { dismissAlert } from "../data/mockSensorData";
import Card from "../components/ui/Card";

function StatusPill({ status }) {
  const styles = {
    active:    "text-semantic-amber bg-semantic-amber/10",
    resolved:  "text-semantic-green bg-semantic-green/10",
    dismissed: "text-surface-400 bg-surface-100",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${styles[status] ?? styles.dismissed}`}>
      {status}
    </span>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
        active ? "bg-surface-200 text-surface-900" : "text-surface-500 hover:text-surface-800 hover:bg-surface-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function Alerts() {
  const nodes = useSensorData();
  const [expandedId, setExpandedId] = useState(null);
  const [filterField, setFilterField] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

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

  const activeCount = allAlerts.filter((a) => a.status === "active").length;

  return (
    <motion.div
      className="max-w-4xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          className="text-xs bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-surface-600 focus:outline-none focus:border-surface-400 transition-colors"
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
            { val: "all", label: "All" },
            { val: "active", label: "Active" },
            { val: "resolved", label: "Resolved" },
          ].map((s) => (
            <FilterPill key={s.val} active={filterStatus === s.val} onClick={() => setFilterStatus(s.val)}>
              {s.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex gap-1">
          {[
            { val: "all", label: "All types" },
            { val: "crop_stress", label: "Crop stress" },
            { val: "corrosion", label: "Corrosion" },
          ].map((t) => (
            <FilterPill key={t.val} active={filterType === t.val} onClick={() => setFilterType(t.val)}>
              {t.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-surface-400">No alerts match your filters.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((alert, i) => {
            const isOpen = expandedId === alert.id;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card padding="none" className="overflow-hidden">
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-surface-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    onClick={() => setExpandedId(isOpen ? null : alert.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="text-surface-300 shrink-0">
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </span>
                    <span className="text-xs text-surface-400 shrink-0 w-32">
                      {new Date(alert.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className="text-sm font-semibold text-surface-900 shrink-0 w-28 truncate">
                      {alert.fieldName}
                    </span>
                    <span className="text-sm text-surface-600 flex-1 truncate">{alert.headline}</span>
                    <StatusPill status={alert.status} />
                  </button>

                  {/* Expanded */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-3 border-t border-surface-100">
                          <p className="text-sm text-surface-600 leading-relaxed mb-3">
                            {alert.recommendation}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {alert.reasoning?.map((r, idx) => (
                              <span key={idx} className="text-[11px] bg-surface-100 text-surface-500 px-2.5 py-1 rounded-md">
                                {r}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4">
                            {alert.status === "active" && (
                              <>
                                {alert.actionable && (
                                  <button className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                                    {alert.actionLabel}
                                  </button>
                                )}
                                <button
                                  className="text-xs text-surface-400 hover:text-surface-700 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissAlert(alert.fieldId, alert.id);
                                  }}
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
