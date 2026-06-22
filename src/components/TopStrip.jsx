import { Bell } from "lucide-react";
import { useSensorData } from "../data/SensorContext";

export default function TopStrip({ title }) {
  const nodes = useSensorData();
  const live = nodes.filter((n) => n.connectivity === "live").length;
  const total = nodes.length;
  const alertCount = nodes.reduce((sum, n) => sum + n.alerts.length, 0);

  const connDot =
    live === total ? "bg-semantic-green" : live === 0 ? "bg-surface-400" : "bg-semantic-amber";

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-surface-200 bg-surface-50 shrink-0">
      <h2 className="text-sm font-semibold text-surface-900 tracking-tight">{title}</h2>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span className={`w-1.5 h-1.5 rounded-full ${connDot}`} />
          <span>
            {live} of {total} nodes online
          </span>
        </div>

        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {alertCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] bg-semantic-red text-white text-[9px] font-semibold flex items-center justify-center rounded-full leading-none px-0.5">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
