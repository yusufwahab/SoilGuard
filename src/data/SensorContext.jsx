import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onValue, off,
  targetMoistRef, aiDashboardRef,
  writeTargetMoisture,
} from "./firebaseService";
import { fetchAllSensors, setPumpOnESP } from "./espService";
// -----------------------------------------------------------------------
// MOCK / DEMO DATA -- DISABLED
// The UI now shows ONLY real ESP32 sensor values, so there's never a doubt
// about whether a number on screen is live hardware data or a demo drift.
// Left commented out (not deleted) in case demo mode is wanted again later.
// -----------------------------------------------------------------------
// import {
//   startStreaming, stopStreaming, getSnapshot, subscribe,
// } from "./mockSensorData";

const SensorContext = createContext(null);

const CROP_CONFIGS = [
  { key: "rice",  id: "SG-RICE",  name: "Rice Paddy",  crop: "Rice"  },
  { key: "beans", id: "SG-BEANS", name: "Beans Field", crop: "Beans" },
  { key: "yam",   id: "SG-YAM",  name: "Yam Plot",    crop: "Yam"   },
];

const POLL_INTERVAL_MS = 3000;

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
  // ── Mock nodes -- DISABLED, always empty so only real ESP32 data renders ──
  // const [mockNodes, setMockNodes] = useState(() => {
  //   startStreaming();
  //   return getSnapshot();
  // });
  const mockNodes = [];

  // ── Real ESP32 nodes (polled directly over the LAN) ──────────────
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
  const pumpStatesRef   = useRef(pumpStates);
  useEffect(() => { pumpStatesRef.current = pumpStates; }, [pumpStates]);

  // ── Mock subscription -- DISABLED ───────────────────────────────
  // useEffect(() => {
  //   const unsub = subscribe((snap) => setMockNodes([...snap]));
  //   return () => { unsub(); stopStreaming(); };
  // }, []);

  // ── ESP32 local polling (replaces the old Firebase sensor listener) ──
  // The ESP32 no longer uploads to Firebase (local-only mode), so real
  // values are fetched straight from its on-device HTTP server instead.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchAllSensors(); // { rice, beans, yam }
        if (cancelled) return;

        CROP_CONFIGS.forEach((cfg) => {
          const s = data[cfg.key];
          if (!s) return;

          historyRefs.current[cfg.key] = [
            ...historyRefs.current[cfg.key],
            { t: Date.now(), moisture: s.moisture, temperature: s.temperature },
          ].slice(-200);

          setRealNodes((prev) => ({
            ...prev,
            [cfg.key]: buildNode(cfg, s, historyRefs.current[cfg.key]),
          }));

          setPumpStates((prev) => {
            if (pumpLoadingRefs.current[cfg.key]) return prev; // don't fight an in-flight command
            const liveState = s.pumpStatus === 1 ? "ON" : "OFF";
            if (prev[cfg.key] === liveState) return prev;
            return { ...prev, [cfg.key]: liveState };
          });
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[ESP32] Poll failed (is it reachable on the LAN?):", err.message);
        setRealNodes((prev) => {
          const next = { ...prev };
          CROP_CONFIGS.forEach((cfg) => {
            next[cfg.key] = buildOfflineNode(cfg, historyRefs.current[cfg.key]);
          });
          return next;
        });
      }
    }

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, []);

  // ── Firebase real-time listeners -- FIREBASE SENSOR/PUMP SYNC DISABLED ──
  // The ESP32 no longer reads or writes Firebase, so those channels would
  // just sit stale. Target moisture + AI dashboard are left active since
  // they're set from this app itself, not from the device.
  useEffect(() => {
    const unsubs = [];

    CROP_CONFIGS.forEach((cfg) => {
      // // Sensor data -- DISABLED, replaced by the ESP32 polling effect above
      // const sRef = sensorRef(cfg.key);
      // const unSensor = onValue(sRef, (snap) => { ... });
      // unsubs.push(() => off(sRef, "value", unSensor));

      // // Pump state -- DISABLED, replaced by pumpStatus read straight off the poll
      // const pRef = pumpStateRef(cfg.key);
      // const unPump = onValue(pRef, (snap) => { ... });
      // unsubs.push(() => off(pRef, "value", unPump));

      // Target moisture (autopilot setting saved from this app)
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

  // ── Pump write -- now goes straight to the ESP32 over the LAN ────
  async function handleSetPump(cropKey, state) {
    if (pumpStatesRef.current[cropKey] === state) return;
    pumpLoadingRefs.current[cropKey] = true;
    setPumpLoadings((prev) => ({ ...prev, [cropKey]: true }));
    try {
      await setPumpOnESP(cropKey, state);
      setPumpStates((prev) => ({ ...prev, [cropKey]: state }));
      if (state === "OFF" && pumpStatesRef.current[cropKey] === "ON") {
        setPumpCycles((c) => ({ ...c, [cropKey]: c[cropKey] + 1 }));
      }
    } catch (err) {
      console.error(`[ESP32] Failed to set ${cropKey} pump:`, err.message);
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
    // Node list -- real ESP32 devices only (mock data disabled above)
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
