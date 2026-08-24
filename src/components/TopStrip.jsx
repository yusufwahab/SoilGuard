import { Bell, Menu, FlaskConical } from "lucide-react";
import { useSensorData, useDemoStatus } from "../data/SensorContext";

export default function TopStrip({ title, onMenuClick }) {
  const nodes = useSensorData();
  const { isDemoMode, isEspDemo, isSupabaseDemo } = useDemoStatus();
  const live = nodes.filter((n) => n.connectivity === "live").length;
  const total = nodes.length;
  const alertCount = nodes.reduce((sum, n) => sum + n.alerts.length, 0);

  const connDot =
    live === total ? "bg-semantic-green" : live === 0 ? "bg-surface-400" : "bg-semantic-amber";

  const demoTooltip = [
    isEspDemo && "ESP32 unreachable — showing simulated sensor readings",
    isSupabaseDemo && "Cloud services unreachable — AI dashboard showing demo data",
  ].filter(Boolean).join(" · ");

  return (
    <header className="h-12 flex items-center justify-between px-4 md:px-6 border-b border-surface-200 bg-surface-50 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={16} />
        </button>
        <h2 className="text-sm font-semibold text-surface-900 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4 md:gap-5">
        {/* Demo/fallback indicator — only shown while something is actually simulated */}
        {isDemoMode && (
          <span
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-full"
            title={demoTooltip}
          >
            <FlaskConical size={11} className="animate-pulse" />
            Demo Data
          </span>
        )}

        {/* Node status — hide on small phones */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-surface-500">
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
            <span className="absolute top-0.5 right-0.5 min-w-3.75 h-3.75 bg-semantic-red text-white text-[9px] font-semibold flex items-center justify-center rounded-full leading-none px-0.5">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
