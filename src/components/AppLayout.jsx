import { useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import TopStrip from "./TopStrip";
import Grain from "./Grain";
import { SensorProvider } from "../data/SensorContext";

const PAGE_TITLES = {
  "/app":               "Overview",
  "/app/fields":        "Fields",
  "/app/ai-dashboard":  "AI Dashboard",
  "/app/alerts":        "Alerts",
  "/app/history":       "History & Analytics",
  "/app/settings":      "Settings",
};

function AppContent() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/app/fields/") ? "Field Detail" : "Dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopStrip title={title} onMenuClick={() => setMobileOpen(true)} />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-auto p-4 md:p-6"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SensorProvider>
      <Grain />
      <AppContent />
    </SensorProvider>
  );
}
