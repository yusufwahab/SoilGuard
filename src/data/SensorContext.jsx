import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  subscribeTargets, subscribeAIDashboard,
  writeTargetMoisture, insertSensorReading,
} from "./supabaseService";
import { fetchAllSensors, setPumpOnESP } from "./espService";
import { sendAlertOnce } from "./whatsappService";
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

// ── WhatsApp alert trigger thresholds ──────────────────────────────
// These watch the SAME poll data the UI renders -- no separate connection
// to the ESP32, so alerts fire on the exact same "live" signal you see
// on screen. Internet-dependent (see whatsappService.js), unlike the
// ESP32 itself, which never needs it.
const RAPID_CHANGE_WINDOW_MS = 60_000;  // look back ~1 minute for a swing
const RAPID_MOISTURE_DELTA   = 15;      // percentage points within that window
const RAPID_TEMP_DELTA       = 5;       // °C within that window
const OFFLINE_ALERT_STREAK   = 3;       // consecutive failed polls before alerting (~9s)

// Persist a sensor reading to Supabase this often (charts/AI history need
// durability across sessions, but writing every 3s poll would be overkill).
const HISTORY_LOG_INTERVAL_MS = 30_000;

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
  const offlineStreakRef = useRef(0); // consecutive failed polls, whole-device
  const lastLoggedRef    = useRef({ rice: 0, beans: 0, yam: 0 });
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

          const now = Date.now();
          const hist = historyRefs.current[cfg.key];

          // Check for a rapid swing BEFORE appending -- compare against the
          // oldest sample still inside the trailing window.
          const baseline = [...hist].reverse().find((h) => now - h.t >= RAPID_CHANGE_WINDOW_MS);
          if (baseline) {
            const moistureDelta = Math.abs(s.moisture - baseline.moisture);
            const tempDelta = Math.abs(s.temperature - baseline.temperature);
            if (moistureDelta >= RAPID_MOISTURE_DELTA) {
              sendAlertOnce(
                `${cfg.key}:moisture-swing`,
                `⚠️ SoilGuard — ${cfg.name}: moisture swung ${moistureDelta.toFixed(0)}pts in ~1min (now ${s.moisture.toFixed(0)}%). Check for a leak, rain, or a dislodged sensor.`
              );
            }
            if (tempDelta >= RAPID_TEMP_DELTA) {
              sendAlertOnce(
                `${cfg.key}:temp-swing`,
                `⚠️ SoilGuard — ${cfg.name}: temperature swung ${tempDelta.toFixed(1)}°C in ~1min (now ${s.temperature.toFixed(1)}°C).`
              );
            }
          }

          historyRefs.current[cfg.key] = [
            ...hist,
            { t: now, moisture: s.moisture, temperature: s.temperature },
          ].slice(-200);

          if (now - lastLoggedRef.current[cfg.key] >= HISTORY_LOG_INTERVAL_MS) {
            lastLoggedRef.current[cfg.key] = now;
            insertSensorReading(cfg.key, s);
          }

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

        // Poll succeeded -- if we were previously in an alerted offline
        // streak, let the phone know it's back before clearing the streak.
        if (offlineStreakRef.current >= OFFLINE_ALERT_STREAK) {
          sendAlertOnce("device:back-online", "🟢 SoilGuard — device is back online.", 0);
        }
        offlineStreakRef.current = 0;
      } catch (err) {
        if (cancelled) return;
        console.error("[ESP32] Poll failed (is it reachable on the LAN?):", err.message);
        offlineStreakRef.current += 1;
        if (offlineStreakRef.current === OFFLINE_ALERT_STREAK) {
          sendAlertOnce("device:offline", `🔴 SoilGuard — device unreachable after ${OFFLINE_ALERT_STREAK} checks. Check power/Wi-Fi.`);
        }
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

  // ── Supabase real-time subscriptions (replaces Firebase onValue) ──────
  // The ESP32 never touches Supabase either -- these back only the
  // internet-OK layer: target moisture / autopilot (set from this app)
  // and the AI dashboard (populated by backend/, on a schedule). See
  // supabase/schema.sql for the tables this expects.
  useEffect(() => {
    const unsubTargets = subscribeTargets((cropKey, row) => {
      if (row && row.target_moisture !== null) {
        setTargetMoistures((prev) => ({ ...prev, [cropKey]: row.target_moisture }));
      }
    });

    const unsubAI = subscribeAIDashboard((cropKey, row) => {
      if (row) setAiDashboard((prev) => ({ ...prev, [cropKey]: row }));
    });

    return () => { unsubTargets(); unsubAI(); };
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
