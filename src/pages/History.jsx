import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useSensorData } from "../data/SensorContext";
import StatBlock from "../components/ui/StatBlock";
import Card from "../components/ui/Card";

const SOIL_LINES = {
  moisture:    { color: "#0284c7", label: "Moisture (%)" },
  pH:          { color: "#16a34a", label: "pH" },
  ec:          { color: "#d97706", label: "EC (dS/m)" },
  temperature: { color: "#dc2626", label: "Temp (°C)" },
};

const CORROSION_LINES = {
  lsi: { color: "#7c3aed", label: "LSI" },
  rsi: { color: "#db2777", label: "RSI" },
};

export default function History() {
  const nodes = useSensorData();
  const [selectedField, setSelectedField] = useState("all");
  const [tab, setTab] = useState("soil");
  const [dateRange, setDateRange] = useState(7);
  const [activeLines, setActiveLines] = useState(
    Object.fromEntries(Object.keys(SOIL_LINES).map((k) => [k, true]))
  );

  const source = useMemo(
    () => (selectedField === "all" ? nodes : nodes.filter((n) => n.id === selectedField)),
    [nodes, selectedField]
  );

  const chartData = useMemo(() => {
    if (source.length === 0) return [];
    const cutoff = Date.now() - dateRange * 24 * 60 * 60 * 1000;
    const buckets = {};
    source.forEach((node) => {
      node.history.forEach((h) => {
        if (h.t < cutoff) return;
        const key = Math.floor(h.t / 3_600_000) * 3_600_000;
        if (!buckets[key]) buckets[key] = { t: key, moisture: 0, pH: 0, ec: 0, temperature: 0, n: 0 };
        buckets[key].moisture    += h.moisture;
        buckets[key].pH          += h.pH;
        buckets[key].ec          += h.ec;
        buckets[key].temperature += h.temperature;
        buckets[key].n           += 1;
      });
    });
    return Object.values(buckets)
      .map((d) => ({
        t: d.t,
        moisture:    +(d.moisture / d.n).toFixed(2),
        pH:          +(d.pH / d.n).toFixed(2),
        ec:          +(d.ec / d.n).toFixed(3),
        temperature: +(d.temperature / d.n).toFixed(2),
      }))
      .sort((a, b) => a.t - b.t);
  }, [source, dateRange]);

  const corrosionData = useMemo(
    () => chartData.map((d) => ({
      t: d.t,
      lsi: +(d.pH - 7.5 + d.ec * 0.1).toFixed(3),
      rsi: +(2 * d.pH - (7.5 + d.ec * 0.1) - 5).toFixed(3),
    })),
    [chartData]
  );

  const avgs = useMemo(() => {
    if (chartData.length === 0) return null;
    const n = chartData.length;
    const sum = chartData.reduce(
      (s, d) => ({ moisture: s.moisture + d.moisture, pH: s.pH + d.pH, ec: s.ec + d.ec, temperature: s.temperature + d.temperature }),
      { moisture: 0, pH: 0, ec: 0, temperature: 0 }
    );
    return {
      moisture:    (sum.moisture / n).toFixed(1) + "%",
      pH:          (sum.pH / n).toFixed(1),
      ec:          (sum.ec / n).toFixed(2) + " dS/m",
      temperature: (sum.temperature / n).toFixed(1) + "°C",
    };
  }, [chartData]);

  const activeCfg = tab === "soil" ? SOIL_LINES : CORROSION_LINES;

  return (
    <motion.div
      className="max-w-6xl space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="text-xs bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-surface-600 focus:outline-none focus:border-surface-400 transition-colors"
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
        >
          <option value="all">All fields</option>
          {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>

        <div className="flex gap-0.5 bg-surface-100 rounded-lg p-0.5">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                dateRange === d
                  ? "bg-surface-50 text-surface-900 shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
              onClick={() => setDateRange(d)}
            >
              {d === 1 ? "24h" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-0.5 bg-surface-100 rounded-lg p-0.5 w-fit">
        {[
          { val: "soil", label: "Soil Trends" },
          { val: "corrosion", label: "Corrosion Trends" },
        ].map((t) => (
          <button
            key={t.val}
            className={`text-xs px-4 py-1.5 rounded-md transition-colors font-medium ${
              tab === t.val
                ? "bg-surface-50 text-surface-900 shadow-sm"
                : "text-surface-500 hover:text-surface-700"
            }`}
            onClick={() => setTab(t.val)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card>
        {/* Line toggles */}
        <div className="flex flex-wrap gap-4 mb-4">
          {Object.entries(activeCfg).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveLines((p) => ({ ...p, [key]: !p[key] }))}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                activeLines[key] !== false ? "text-surface-900" : "text-surface-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </button>
          ))}
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={tab === "soil" ? chartData : corrosionData}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="2 6" stroke="#e9e4db" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
                tick={{ fontSize: 10, fill: "#b8ad99" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#b8ad99" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#faf8f5",
                  border: "1px solid #e9e4db",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#3a3429",
                }}
              />
              {Object.entries(activeCfg).map(([key, cfg]) =>
                activeLines[key] !== false ? (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={cfg.color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Average stats */}
      {avgs ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card tinted padding="md"><StatBlock label="Avg Moisture" value={avgs.moisture} /></Card>
          <Card tinted padding="md"><StatBlock label="Avg pH" value={avgs.pH} /></Card>
          <Card tinted padding="md"><StatBlock label="Avg EC" value={avgs.ec} /></Card>
          <Card tinted padding="md"><StatBlock label="Avg Temp" value={avgs.temperature} /></Card>
        </div>
      ) : (
        <p className="text-sm text-surface-400 text-center py-8">No data for this period.</p>
      )}
    </motion.div>
  );
}
