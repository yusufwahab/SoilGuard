import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onValue, off,
  sensorRef, pumpStateRef, targetMoistRef, aiDashboardRef,
  writePumpState, writeTargetMoisture,
} from "./firebaseService";
import {
  startStreaming, stopStreaming, getSnapshot, subscribe,
} from "./mockSensorData";

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
    moisture:      sensor.moisture    ?? 0,
    pH:            sensor.pH          ?? 7,
    ec:            sensor.EC          ?? 0,
    temperature:   sensor.temperature ?? 0,
    humidity:      sensor.humidity    ?? 0,
    battery:       100,
    solarCharging: true,
    connectivity:  "live",
    lastSeen:      Date.now(),
    alerts:        [],
    history,
    actuationState: null,
    isRealDevice:  true,
    pumpStatus:    sensor.pumpStatus  ?? 0,
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
  // ── Mock nodes (demo data — always present as demo/fallback) ────
  const [mockNodes, setMockNodes] = useState(() => {
    startStreaming();
    return getSnapshot();
  });

  // ── Real Firebase nodes ─────────────────────────────────────────
  const [realNodes,       setRealNodes]       = useState({});
  const [pumpStates,      setPumpStates]      = useState({ rice: null, beans: null, yam: null });
  const [pumpLoadings,    setPumpLoadings]    = useState({ rice: false, beans: false, yam: false });
  const [targetMoistures, setTargetMoistures] = useState({ rice: null, beans: null, yam: null });
  const [aiDashboard,     setAiDashboard]     = useState({});

  // ── Autopilot ───────────────────────────────────────────────────
  const [autopilotEnabled, setAutopilotEnabled] = useState({ rice: false, beans: false, yam: false });
  const [autopilotTargets, setAutopilotTargets] = useState({ rice: 60, beans: 60, yam: 60 });

  // ── Session sustainability stats ────────────────────────────────
  const [pumpCycles, setPumpCycles] = useState({ rice: 0, beans: 0, yam: 0 });

  const pumpLoadingRefs = useRef({ rice: false, beans: false, yam: false });
  const historyRefs     = useRef({ rice: [], beans: [], yam: [] });

  // ── Mock subscription ───────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribe((snap) => setMockNodes([...snap]));
    return () => { unsub(); stopStreaming(); };
  }, []);

  // ── Firebase real-time listeners ────────────────────────────────
  useEffect(() => {
    const unsubs = [];

    CROP_CONFIGS.forEach((cfg) => {
      // Sensor data
      const sRef = sensorRef(cfg.key);
      const unSensor = onValue(sRef, (snap) => {
        const s = snap.val();
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
        setPumpStates((prev) => {
          if (pumpLoadingRefs.current[cfg.key]) return prev;
          if (prev[cfg.key] !== null) return prev;
          return { ...prev, [cfg.key]: s.pumpStatus === 1 ? "ON" : "OFF" };
        });
      }, (err) => {
        console.error(`[Firebase] ${cfg.key}/sensor:`, err.message);
        setRealNodes((prev) => ({
          ...prev,
          [cfg.key]: buildOfflineNode(cfg, historyRefs.current[cfg.key]),
        }));
      });
      unsubs.push(() => off(sRef, "value", unSensor));

      // Pump state — track ON→OFF cycles for sustainability stats
      const pRef = pumpStateRef(cfg.key);
      const unPump = onValue(pRef, (snap) => {
        const val = snap.val();
        if (val !== null && !pumpLoadingRefs.current[cfg.key]) {
          setPumpStates((prev) => {
            if (prev[cfg.key] === "ON" && val === "OFF") {
              setPumpCycles((c) => ({ ...c, [cfg.key]: c[cfg.key] + 1 }));
            }
            return { ...prev, [cfg.key]: val };
          });
        }
      });
      unsubs.push(() => off(pRef, "value", unPump));

      // Target moisture
      const tRef = targetMoistRef(cfg.key);
      const unTarget = onValue(tRef, (snap) => {
        const val = snap.val();
        if (val !== null) setTargetMoistures((prev) => ({ ...prev, [cfg.key]: val }));
      });
      unsubs.push(() => off(tRef, "value", unTarget));

      // AI dashboard
      const aRef = aiDashboardRef(cfg.key);
      const unAI = onValue(aRef, (snap) => {
        const val = snap.val();
        if (val !== null) setAiDashboard((prev) => ({ ...prev, [cfg.key]: val }));
      });
      unsubs.push(() => off(aRef, "value", unAI));
    });

    return () => unsubs.forEach((fn) => fn());
  }, []);

  // ── Pump write ──────────────────────────────────────────────────
  async function handleSetPump(cropKey, state) {
    if (pumpStates[cropKey] === state) return;
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

  // ── Autopilot write ─────────────────────────────────────────────
  async function handleSetAutopilot(cropKey, enabled, target) {
    const newTarget = target ?? autopilotTargets[cropKey];
    setAutopilotEnabled((prev) => ({ ...prev, [cropKey]: enabled }));
    if (target !== undefined) {
      setAutopilotTargets((prev) => ({ ...prev, [cropKey]: target }));
    }
    // Null disables autopilot on device; a number enables it
    await writeTargetMoisture(cropKey, enabled ? newTarget : null);
  }

  // ── Derived values ──────────────────────────────────────────────
  const allRealNodes  = CROP_CONFIGS.map((cfg) => realNodes[cfg.key]).filter(Boolean);
  const totalCycles   = Object.values(pumpCycles).reduce((a, b) => a + b, 0);
  const waterSavedL   = totalCycles * 15; // est. 15L saved per precision cycle vs manual flooding
  const autopilotCount = Object.values(autopilotEnabled).filter(Boolean).length;

  const value = {
    // Merged node list — mock first, then real (real overrides nothing, they coexist)
    nodes:            [...mockNodes, ...allRealNodes],
    // Legacy rice-only surface (keeps existing usePumpControl callers working)
    pumpState:        pumpStates.rice,
    pumpLoading:      pumpLoadings.rice,
    setPump:          (state) => handleSetPump("rice", state),
    // Per-crop
    pumpStates,
    pumpLoadings,
    setPumpForCrop:   handleSetPump,
    targetMoistures,
    aiDashboard,
    realNodes,
    // Autopilot
    autopilotEnabled,
    autopilotTargets,
    setAutopilot:     handleSetAutopilot,
    // Sustainability stats
    pumpCycles,
    totalCycles,
    waterSavedL,
    autopilotCount,
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
    pumpStates:       ctx.pumpStates,
    pumpLoadings:     ctx.pumpLoadings,
    setPumpForCrop:   ctx.setPumpForCrop,
    targetMoistures:  ctx.targetMoistures,
    realNodes:        ctx.realNodes,
    autopilotEnabled: ctx.autopilotEnabled,
    autopilotTargets: ctx.autopilotTargets,
    setAutopilot:     ctx.setAutopilot,
    pumpCycles:       ctx.pumpCycles,
    totalCycles:      ctx.totalCycles,
    waterSavedL:      ctx.waterSavedL,
    autopilotCount:   ctx.autopilotCount,
  };
}

export function useAIDashboard() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAIDashboard must be used within SensorProvider");
  return ctx.aiDashboard;
}

export { SensorContext };
