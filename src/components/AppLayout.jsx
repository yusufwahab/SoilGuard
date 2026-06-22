import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import TopStrip from "./TopStrip";
import Grain from "./Grain";
import { SensorProvider } from "../data/SensorContext";

const PAGE_TITLES = {
  "/app":          "Overview",
  "/app/fields":   "Fields",
  "/app/alerts":   "Alerts",
  "/app/history":  "History & Analytics",
  "/app/settings": "Settings",
};

function AppContent() {
  const { pathname } = useLocation();
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/app/fields/") ? "Field Detail" : "Dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopStrip title={title} />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 overflow-auto p-6"
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
