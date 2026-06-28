import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onValue, off,
  sensorRef, pumpStateRef, targetMoistRef, aiDashboardRef,
  writePumpState,
} from "./firebaseService";

const SensorContext = createContext(null);

const CROP_CONFIGS = [
  { key: "rice",  id: "SG-RICE",  name: "Rice Paddy",  crop: "Rice"  },
  { key: "beans", id: "SG-BEANS", name: "Beans Field", crop: "Beans" },
  { key: "yam",   id: "SG-YAM",  name: "Yam Plot",    crop: "Yam"   },
];

function buildNode(cfg, sensor, history) {
  return {
    id:            cfg.id,
    name:          cfg.name,
    crop:          cfg.crop,
    lat: 0, lng: 0,
    moisture:      sensor.moisture ?? 0,
    pH:            sensor.pH ?? 7,
    ec:            sensor.EC ?? 0,
    temperature:   sensor.temperature ?? 0,
    humidity:      sensor.humidity ?? 0,
    battery:       100,
    solarCharging: true,
    connectivity:  "live",
    lastSeen:      Date.now(),
    alerts:        [],
    history,
    actuationState: null,
    isRealDevice:  true,
    pumpStatus:    sensor.pumpStatus ?? 0,
  };
}

function buildOfflineNode(cfg, history) {
  return {
    id: cfg.id, name: cfg.name, crop: cfg.crop,
    lat: 0, lng: 0,
    moisture: 0, pH: 7, ec: 0, temperature: 0, humidity: 0,
    battery: 0, solarCharging: false,
    connectivity: "offline",
    lastSeen: Date.now() - 60_000,
    alerts: [], history,
    actuationState: null,
    isRealDevice: true,
    pumpStatus: 0,
  };
}

export function SensorProvider({ children }) {
  const [realNodes,       setRealNodes]       = useState({});
  const [pumpStates,      setPumpStates]      = useState({ rice: null, beans: null, yam: null });
  const [pumpLoadings,    setPumpLoadings]    = useState({ rice: false, beans: false, yam: false });
  const [targetMoistures, setTargetMoistures] = useState({ rice: null, beans: null, yam: null });
  const [aiDashboard,     setAiDashboard]     = useState({});

  const pumpLoadingRefs = useRef({ rice: false, beans: false, yam: false });
  const historyRefs     = useRef({ rice: [], beans: [], yam: [] });

  // ── Firebase real-time listeners ────────────────────────────────
  useEffect(() => {
    const unsubscribers = [];

    CROP_CONFIGS.forEach((cfg) => {
      // Sensor listener
      const sRef = sensorRef(cfg.key);
      const sensorUnsub = onValue(sRef, (snapshot) => {
        const s = snapshot.val();
        if (!s) {
          setRealNodes((prev) => ({
            ...prev,
            [cfg.key]: prev[cfg.key]
              ? { ...prev[cfg.key], connectivity: "offline" }
              : buildOfflineNode(cfg, historyRefs.current[cfg.key]),
          }));
          return;
        }
        historyRefs.current[cfg.key] = [
          ...historyRefs.current[cfg.key],
          { t: Date.now(), moisture: s.moisture, pH: s.pH, ec: s.EC, temperature: s.temperature },
        ].slice(-200);

        setRealNodes((prev) => ({
          ...prev,
          [cfg.key]: buildNode(cfg, s, historyRefs.current[cfg.key]),
        }));

        // Sync pump state from telemetry only if no command pending
        setPumpStates((prev) => {
          if (pumpLoadingRefs.current[cfg.key]) return prev;
          if (prev[cfg.key] !== null) return prev; // already set by pump_state listener
          return { ...prev, [cfg.key]: s.pumpStatus === 1 ? "ON" : "OFF" };
        });
      }, (err) => {
        console.error(`[Firebase] ${cfg.key}/sensor error:`, err.message);
        setRealNodes((prev) => ({
          ...prev,
          [cfg.key]: buildOfflineNode(cfg, historyRefs.current[cfg.key]),
        }));
      });
      unsubscribers.push(() => off(sRef, "value", sensorUnsub));

      // Pump state listener
      const pRef = pumpStateRef(cfg.key);
      const pumpUnsub = onValue(pRef, (snapshot) => {
        const val = snapshot.val();
        if (val !== null && !pumpLoadingRefs.current[cfg.key]) {
          setPumpStates((prev) => ({ ...prev, [cfg.key]: val }));
        }
      });
      unsubscribers.push(() => off(pRef, "value", pumpUnsub));

      // Target moisture listener
      const tRef = targetMoistRef(cfg.key);
      const targetUnsub = onValue(tRef, (snapshot) => {
        const val = snapshot.val();
        if (val !== null) {
          setTargetMoistures((prev) => ({ ...prev, [cfg.key]: val }));
        }
      });
      unsubscribers.push(() => off(tRef, "value", targetUnsub));

      // AI Dashboard listener
      const aRef = aiDashboardRef(cfg.key);
      const aiUnsub = onValue(aRef, (snapshot) => {
        const val = snapshot.val();
        if (val !== null) {
          setAiDashboard((prev) => ({ ...prev, [cfg.key]: val }));
        }
      });
      unsubscribers.push(() => off(aRef, "value", aiUnsub));
    });

    return () => unsubscribers.forEach((fn) => fn());
  }, []);

  // ── Per-crop pump write (optimised — no redundant writes) ───────
  async function handleSetPump(cropKey, state) {
    const current = pumpStates[cropKey];
    if (current === state) return; // no-op if already in desired state
    pumpLoadingRefs.current[cropKey] = true;
    setPumpLoadings((prev) => ({ ...prev, [cropKey]: true }));
    try {
      await writePumpState(cropKey, state);
      setPumpStates((prev) => ({ ...prev, [cropKey]: state }));
    } finally {
      pumpLoadingRefs.current[cropKey] = false;
      setPumpLoadings((prev) => ({ ...prev, [cropKey]: false }));
    }
  }

  // ── Context value ────────────────────────────────────────────────
  const allRealNodes = CROP_CONFIGS.map((cfg) => realNodes[cfg.key]).filter(Boolean);

  const value = {
    nodes:           allRealNodes,
    // legacy rice-only (keeps FieldDetail working)
    pumpState:       pumpStates.rice,
    pumpLoading:     pumpLoadings.rice,
    setPump:         (state) => handleSetPump("rice", state),
    // per-crop
    pumpStates,
    pumpLoadings,
    setPumpForCrop:  handleSetPump,
    targetMoistures,
    aiDashboard,
    realNodes,
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensorData must be used within SensorProvider");
  return ctx.nodes;
}

export function usePumpControl() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("usePumpControl must be used within SensorProvider");
  return { pumpState: ctx.pumpState, pumpLoading: ctx.pumpLoading, setPump: ctx.setPump };
}

export function useCropControls() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useCropControls must be used within SensorProvider");
  return {
    pumpStates:      ctx.pumpStates,
    pumpLoadings:    ctx.pumpLoadings,
    setPumpForCrop:  ctx.setPumpForCrop,
    targetMoistures: ctx.targetMoistures,
    realNodes:       ctx.realNodes,
  };
}

export function useAIDashboard() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAIDashboard must be used within SensorProvider");
  return ctx.aiDashboard;
}

export { SensorContext };
