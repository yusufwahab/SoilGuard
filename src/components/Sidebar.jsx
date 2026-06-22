import { useState } from "react";
import { NavLink } from "react-router-dom";
import { clsx as cx } from "clsx";
import {
  LayoutDashboard, Map, Bell, BarChart3,
  Settings, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";

const navItems = [
  { to: "/app", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/app/fields", icon: Map, label: "Fields" },
  { to: "/app/alerts", icon: Bell, label: "Alerts" },
  { to: "/app/history", icon: BarChart3, label: "History & Analytics" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cx(
        "h-screen flex flex-col border-r border-surface-200 bg-surface-50 transition-[width] duration-200 shrink-0 overflow-hidden",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Wordmark */}
      <div className="h-12 flex items-center px-4 border-b border-surface-200 shrink-0">
        {!collapsed && (
          <span className="text-sm font-bold text-surface-900 tracking-tight select-none flex-1 whitespace-nowrap">
            SoilGuard
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          className={cx(
            "w-7 h-7 flex items-center justify-center rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cx(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-surface-500 hover:text-surface-900 hover:bg-surface-100"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={cx("shrink-0", isActive && "text-brand-600")}
                />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        <div className="my-2 border-t border-surface-100" />

        <NavLink
          to="/app/settings"
          title={collapsed ? "Settings" : undefined}
          className={({ isActive }) =>
            cx(
              "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap",
              isActive
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-surface-500 hover:text-surface-900 hover:bg-surface-100"
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={17} className={cx("shrink-0", isActive && "text-brand-600")} />
              {!collapsed && <span>Settings</span>}
            </>
          )}
        </NavLink>
      </nav>

      {/* Account */}
      <div className="border-t border-surface-200 p-2 shrink-0">
        <button
          title={collapsed ? "Farmer Kalu" : undefined}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-brand-700 text-white text-[11px] flex items-center justify-center font-bold shrink-0 select-none">
            FK
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-medium text-surface-700 truncate whitespace-nowrap">
                Farmer Kalu
              </span>
              <ChevronDown size={13} className="text-surface-400 shrink-0" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
