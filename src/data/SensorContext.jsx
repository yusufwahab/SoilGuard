import { createContext, useContext, useEffect, useRef, useState } from "react";
import { startStreaming, stopStreaming, getSnapshot, subscribe } from "./mockSensorData";
import { fetchSensorData, fetchPumpState, writePumpState, fetchAIDashboard } from "./firebaseService";

const SensorContext = createContext(null);

const RICE_ID = "SG-RICE";
const POLL_MS = 3000;

function buildRiceNode(data, history) {
  return {
    id:           RICE_ID,
    name:         "Rice Paddy",
    crop:         "Rice",
    lat:          0,
    lng:          0,
    moisture:     data.moisture,
    pH:           data.pH,
    ec:           data.EC,           // Firebase uses uppercase EC
    temperature:  data.temperature,
    humidity:     data.humidity,
    battery:      100,               // not exposed by firmware
    solarCharging:true,
    connectivity: "live",
    lastSeen:     Date.now(),
    alerts:       [],
    history,
    actuationState: null,
    isRealDevice: true,
    pumpStatus:   data.pumpStatus,   // 0 or 1 from telemetry
  };
}

const OFFLINE_RICE = {
  id:           RICE_ID,
  name:         "Rice Paddy",
  crop:         "Rice",
  lat: 0, lng: 0,
  moisture: 0, pH: 7, ec: 0, temperature: 25, humidity: 50,
  battery: 0, solarCharging: false,
  connectivity: "offline",
  lastSeen:     Date.now() - 60_000,
  alerts: [], history: [],
  actuationState: null,
  isRealDevice: true,
  pumpStatus: 0,
};

export function SensorProvider({ children }) {
  const [mockNodes, setMockNodes] = useState(() => {
    startStreaming();
    return getSnapshot();
  });

  const [riceNode,     setRiceNode]     = useState(null);
  const [pumpState,    setPumpState]    = useState(null);
  const [pumpLoading,  setPumpLoading]  = useState(false);
  const [aiDashboard,  setAiDashboard]  = useState({});
  const pumpLoadingRef = useRef(false);
  const historyRef = useRef([]);

  // ── Mock data subscription ──────────────────────────────────────
  useEffect(() => {
    const unsub = subscribe((snap) => setMockNodes([...snap]));
    return () => { unsub(); stopStreaming(); };
  }, []);

  // ── Firebase polling ────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const [sensor, pump, aiRice] = await Promise.all([fetchSensorData(), fetchPumpState(), fetchAIDashboard("rice").catch(() => null)]);
        if (aiRice) setAiDashboard((prev) => ({ ...prev, rice: aiRice }));
        if (!active) return;

        // Accumulate history (kept for the session, up to 200 points)
        historyRef.current = [
          ...historyRef.current,
          {
            t:           Date.now(),
            moisture:    sensor.moisture,
            pH:          sensor.pH,
            ec:          sensor.EC,
            temperature: sensor.temperature,
          },
        ].slice(-200);

        setRiceNode(buildRiceNode(sensor, historyRef.current));
        // Sync pump state from telemetry if no explicit command is pending
        setPumpState((prev) => {
          if (pumpLoadingRef.current) return prev;
          const telemetry = sensor.pumpStatus === 1 ? "ON" : "OFF";
          // prefer the explicit pump_state.json value, fall back to telemetry
          return pump ?? telemetry;
        });

        console.log(
          "%c[SensorContext] poll",
          "color:#d97706;font-weight:bold",
          new Date().toLocaleTimeString(),
          {
            temperature:  sensor.temperature,
            humidity:     sensor.humidity,
            moisture:     sensor.moisture,
            pH:           sensor.pH,
            EC:           sensor.EC,
            pumpStatus:   sensor.pumpStatus,
            pump_state:   pump,
          }
        );
      } catch (err) {
        if (!active) return;
        console.error("%c[SensorContext] poll failed", "color:#dc2626;font-weight:bold", err.message);
        setRiceNode((prev) => prev
          ? { ...prev, connectivity: "offline", lastSeen: prev.lastSeen }
          : { ...OFFLINE_RICE, history: historyRef.current }
        );
      }
    }

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // ── Pump control ────────────────────────────────────────────────
  async function handleSetPump(state) {
    pumpLoadingRef.current = true;
    setPumpLoading(true);
    try {
      await writePumpState(state);
      setPumpState(state);
    } finally {
      pumpLoadingRef.current = false;
      setPumpLoading(false);
    }
  }

  // ── Context value ───────────────────────────────────────────────
  const value = {
    nodes:       riceNode ? [...mockNodes, riceNode] : mockNodes,
    pumpState,
    pumpLoading,
    setPump:     handleSetPump,
    aiDashboard,
  };

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

// Returns array of all nodes (backward-compatible with all existing consumers)
export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensorData must be used within SensorProvider");
  return ctx.nodes;
}

// Pump control — only used by FieldDetail for the real device
export function usePumpControl() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("usePumpControl must be used within SensorProvider");
  return { pumpState: ctx.pumpState, pumpLoading: ctx.pumpLoading, setPump: ctx.setPump };
}

// AI Dashboard data — keyed by crop name
export function useAIDashboard() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAIDashboard must be used within SensorProvider");
  return ctx.aiDashboard;
}

export { SensorContext };
