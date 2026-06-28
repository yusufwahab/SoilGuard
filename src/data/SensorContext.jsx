import { createContext, useContext, useEffect, useRef, useState } from "react";
import { startStreaming, stopStreaming, getSnapshot, subscribe } from "./mockSensorData";
import {
  fetchSensor, fetchPumpState, writePumpState,
  fetchTargetMoisture, fetchAIDashboard,
} from "./firebaseService";

const SensorContext = createContext(null);

const POLL_MS = 3000;

const CROP_CONFIGS = [
  { key: "rice",  id: "SG-RICE",  name: "Rice Paddy",   crop: "Rice"  },
  { key: "beans", id: "SG-BEANS", name: "Beans Field",  crop: "Beans" },
  { key: "yam",   id: "SG-YAM",  name: "Yam Plot",     crop: "Yam"   },
];

function buildNode(cfg, sensor, history) {
  return {
    id:            cfg.id,
    name:          cfg.name,
    crop:          cfg.crop,
    lat: 0, lng: 0,
    moisture:      sensor.moisture,
    pH:            sensor.pH,
    ec:            sensor.EC,
    temperature:   sensor.temperature,
    humidity:      sensor.humidity,
    battery:       100,
    solarCharging: true,
    connectivity:  "live",
    lastSeen:      Date.now(),
    alerts:        [],
    history,
    actuationState: null,
    isRealDevice:  true,
    pumpStatus:    sensor.pumpStatus,
  };
}

function buildOfflineNode(cfg, history) {
  return {
    id: cfg.id, name: cfg.name, crop: cfg.crop,
    lat: 0, lng: 0,
    moisture: 0, pH: 7, ec: 0, temperature: 25, humidity: 50,
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
  const [mockNodes, setMockNodes] = useState(() => {
    startStreaming();
    return getSnapshot();
  });

  // keyed by crop key: { rice: node, beans: node, yam: node }
  const [realNodes,      setRealNodes]      = useState({});
  // keyed by crop key: { rice: "ON"|"OFF"|null, ... }
  const [pumpStates,     setPumpStates]     = useState({ rice: null, beans: null, yam: null });
  // keyed by crop key: { rice: false, ... }
  const [pumpLoadings,   setPumpLoadings]   = useState({ rice: false, beans: false, yam: false });
  // keyed by crop key: { rice: 60, beans: 55, yam: 45 }
  const [targetMoistures, setTargetMoistures] = useState({ rice: null, beans: null, yam: null });
  const [aiDashboard,    setAiDashboard]    = useState({});

  const pumpLoadingRefs = useRef({ rice: false, beans: false, yam: false });
  const historyRefs     = useRef({ rice: [], beans: [], yam: [] });

  // ── Mock data subscription ──────────────────────────────────────
  useEffect(() => {
    const unsub = subscribe((snap) => setMockNodes([...snap]));
    return () => { unsub(); stopStreaming(); };
  }, []);

  // ── Firebase polling — all three crops ─────────────────────────
  useEffect(() => {
    let active = true;

    async function poll() {
      await Promise.allSettled(
        CROP_CONFIGS.map(async (cfg) => {
          try {
            const [sensor, pump, target, ai] = await Promise.allSettled([
              fetchSensor(cfg.key),
              fetchPumpState(cfg.key),
              fetchTargetMoisture(cfg.key),
              fetchAIDashboard(cfg.key),
            ]);

            if (!active) return;

            if (sensor.status === "fulfilled" && sensor.value) {
              const s = sensor.value;

              // accumulate history
              historyRefs.current[cfg.key] = [
                ...historyRefs.current[cfg.key],
                { t: Date.now(), moisture: s.moisture, pH: s.pH, ec: s.EC, temperature: s.temperature },
              ].slice(-200);

              setRealNodes((prev) => ({
                ...prev,
                [cfg.key]: buildNode(cfg, s, historyRefs.current[cfg.key]),
              }));

              // sync pump state from firebase, fall back to telemetry
              setPumpStates((prev) => {
                if (pumpLoadingRefs.current[cfg.key]) return prev;
                const telemetry = s.pumpStatus === 1 ? "ON" : "OFF";
                const firebaseVal = pump.status === "fulfilled" ? pump.value : null;
                return { ...prev, [cfg.key]: firebaseVal ?? telemetry };
              });
            } else {
              setRealNodes((prev) => ({
                ...prev,
                [cfg.key]: prev[cfg.key]
                  ? { ...prev[cfg.key], connectivity: "offline" }
                  : buildOfflineNode(cfg, historyRefs.current[cfg.key]),
              }));
            }

            if (target.status === "fulfilled" && target.value !== null) {
              setTargetMoistures((prev) => ({ ...prev, [cfg.key]: target.value }));
            }

            if (ai.status === "fulfilled" && ai.value !== null) {
              setAiDashboard((prev) => ({ ...prev, [cfg.key]: ai.value }));
            }

            console.log(
              `%c[SensorContext] ${cfg.key} poll`,
              "color:#d97706;font-weight:bold",
              new Date().toLocaleTimeString(),
              {
                sensor: sensor.status === "fulfilled" ? sensor.value : "failed",
                pump:   pump.status === "fulfilled"   ? pump.value   : "failed",
                target: target.status === "fulfilled" ? target.value : "failed",
              }
            );
          } catch (err) {
            console.error(`%c[SensorContext] ${cfg.key} poll error`, "color:#dc2626;font-weight:bold", err.message);
          }
        })
      );
    }

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // ── Per-crop pump control ────────────────────────────────────────
  async function handleSetPump(cropKey, state) {
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
  const allRealNodes = CROP_CONFIGS
    .map((cfg) => realNodes[cfg.key])
    .filter(Boolean);

  const value = {
    nodes:          [...mockNodes, ...allRealNodes],
    // legacy single-crop pump (rice) — keeps FieldDetail working
    pumpState:      pumpStates.rice,
    pumpLoading:    pumpLoadings.rice,
    setPump:        (state) => handleSetPump("rice", state),
    // full per-crop controls
    pumpStates,
    pumpLoadings,
    setPumpForCrop: handleSetPump,
    targetMoistures,
    aiDashboard,
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

// Per-crop pump + target moisture — used by AIDashboard
export function useCropControls() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useCropControls must be used within SensorProvider");
  return {
    pumpStates:     ctx.pumpStates,
    pumpLoadings:   ctx.pumpLoadings,
    setPumpForCrop: ctx.setPumpForCrop,
    targetMoistures: ctx.targetMoistures,
  };
}

export function useAIDashboard() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAIDashboard must be used within SensorProvider");
  return ctx.aiDashboard;
}

export { SensorContext };
