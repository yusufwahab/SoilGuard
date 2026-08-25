import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  subscribeTargets, subscribeAIDashboard,
  writeTargetMoisture, insertSensorReading,
} from "./supabaseService";
import { fetchAllSensors, setPumpOnESP } from "./espService";
import { sendAlertOnce } from "./telegramService";
import { ensureNotificationPermission, sendBrowserNotification } from "./browserNotify";
import { getMockSensorSnapshot } from "./mockEspService";
// -----------------------------------------------------------------------
// DEMO FALLBACK
// If the ESP32 can't be reached (off, no Wi-Fi, wrong network) or
// Supabase/the internet is down, the UI falls back to visibly-labeled
// demo data instead of a dead/blank screen -- see connectivity: "demo"
// below and the navbar indicator (useDemoStatus + TopStrip.jsx). This is
// distinct from the old always-on mock system (mockSensorData.js, still
// unused/commented below) -- that blended fake fields in permanently;
// this only activates as a fallback, and is always clearly flagged.
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

// ── Alert trigger thresholds ────────────────────────────────────────
// These watch the SAME poll data the UI renders -- no separate connection
// to the ESP32, so alerts fire on the exact same "live" signal you see
// on screen. Internet-dependent (see telegramService.js), unlike the
// ESP32 itself, which never needs it.
const RAPID_CHANGE_WINDOW_MS = 60_000;  // look back ~1 minute for a swing
const RAPID_MOISTURE_DELTA   = 15;      // percentage points within that window
const RAPID_TEMP_DELTA       = 5;       // °C within that window
const OFFLINE_ALERT_STREAK   = 3;       // consecutive failed polls before alerting (~9s)

// Persist a sensor reading to Supabase this often (charts/AI history need
// durability across sessions, but writing every 3s poll would be overkill).
const HISTORY_LOG_INTERVAL_MS = 30_000;

// connectivity: "live" for real ESP32 data, "demo" for the simulated
// fallback -- same shape either way, so nothing downstream needs to
// special-case it beyond reading node.connectivity for the badge/label.
// `alerts` defaults to [] for backwards compat, but callers pass the
// crop's active alerts (see deviceAlerts state below).
function buildNode(cfg, sensor, history, connectivity = "live", alerts = []) {
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
    connectivity,
    lastSeen:      Date.now(),
    alerts,
    history,
    actuationState: null,
    isRealDevice:  true,
    pumpStatus:    sensor.pumpStatus  ?? 0,
  };
}

// A hardware-disconnect alert -- shown as a red critical card in the
// Alerts page and as a red badge on the Overview field card. Fires when
// the whole ESP32 device (all 3 crops share one Wi-Fi connection) stops
// responding for OFFLINE_ALERT_STREAK consecutive polls, same moment the
// Telegram "device offline" message fires -- both reflect the same signal.
function buildConnectivityAlert(cfg) {
  const outageSec = Math.round((OFFLINE_ALERT_STREAK * POLL_INTERVAL_MS) / 1000);
  return {
    id: `alert-${cfg.id}-connectivity-${Date.now()}`,
    fieldId: cfg.id,
    type: "connectivity",
    severity: "critical",
    headline: `${cfg.name} sensor node disconnected`,
    detail: `The SoilGuard device for ${cfg.crop} hasn't responded to ${OFFLINE_ALERT_STREAK} consecutive checks (~${outageSec}s). It may be powered off, out of Wi-Fi range, or on the wrong network.`,
    reasoning: [
      `${OFFLINE_ALERT_STREAK} consecutive failed polls`,
      `Node: ${cfg.id}`,
    ],
    recommendation: "Check that the ESP32 is powered on and connected to the same Wi-Fi network as this dashboard. The field is showing simulated demo data until it reconnects.",
    actionable: false,
    daysToImpact: 0,
    createdAt: Date.now(),
    status: "active",
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

  // ── Demo fallback status (surfaced via useDemoStatus + the navbar) ───
  const [espDemoMode, setEspDemoMode] = useState(false);
  const [supabaseOk,  setSupabaseOk]  = useState(true); // optimistic until we hear otherwise

  // ── Alerts (connectivity so far -- see buildConnectivityAlert) ───────
  const [deviceAlerts, setDeviceAlerts] = useState({ rice: [], beans: [], yam: [] });

  const pumpLoadingRefs = useRef({ rice: false, beans: false, yam: false });
  const historyRefs     = useRef({ rice: [], beans: [], yam: [] });
  const pumpStatesRef   = useRef(pumpStates);
  const offlineStreakRef = useRef(0); // consecutive failed polls, whole-device
  const lastLoggedRef    = useRef({ rice: 0, beans: 0, yam: 0 });
  const deviceAlertsRef  = useRef(deviceAlerts);
  useEffect(() => { pumpStatesRef.current = pumpStates; }, [pumpStates]);
  useEffect(() => { deviceAlertsRef.current = deviceAlerts; }, [deviceAlerts]);

  // Ask for browser-notification permission once, early -- no-op if the
  // browser doesn't support it or the user already granted/denied it in
  // a previous session (see browserNotify.js).
  useEffect(() => { ensureNotificationPermission(); }, []);

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
            [cfg.key]: buildNode(
              cfg, s, historyRefs.current[cfg.key], "live",
              deviceAlertsRef.current[cfg.key].filter((a) => a.status === "active")
            ),
          }));

          setPumpStates((prev) => {
            if (pumpLoadingRefs.current[cfg.key]) return prev; // don't fight an in-flight command
            const liveState = s.pumpStatus === 1 ? "ON" : "OFF";
            if (prev[cfg.key] === liveState) return prev;
            return { ...prev, [cfg.key]: liveState };
          });
        });

        // Poll succeeded -- if we were previously in an alerted offline
        // streak, let the phone know it's back and resolve the connectivity
        // alert card before clearing the streak.
        if (offlineStreakRef.current >= OFFLINE_ALERT_STREAK) {
          sendAlertOnce("device:back-online", "🟢 SoilGuard — device is back online.", 0);
          sendBrowserNotification("SoilGuard — Device back online", "The sensor device is reporting again.", { tag: "soilguard-device-offline" });
          setDeviceAlerts((prev) => {
            const next = { ...prev };
            CROP_CONFIGS.forEach((cfg) => {
              next[cfg.key] = prev[cfg.key].map((a) =>
                a.type === "connectivity" && a.status === "active" ? { ...a, status: "resolved" } : a
              );
            });
            return next;
          });
        }
        offlineStreakRef.current = 0;
        setEspDemoMode(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[ESP32] Poll failed (is it reachable on the LAN?):", err.message);
        offlineStreakRef.current += 1;
        if (offlineStreakRef.current === OFFLINE_ALERT_STREAK) {
          sendAlertOnce("device:offline", `🔴 SoilGuard — device unreachable after ${OFFLINE_ALERT_STREAK} checks. Check power/Wi-Fi.`);
          sendBrowserNotification(
            "SoilGuard — Device disconnected",
            `The sensor device hasn't responded after ${OFFLINE_ALERT_STREAK} checks. Check that it's powered on and connected to Wi-Fi.`,
            { tag: "soilguard-device-offline" }
          );
          // One red "disconnected" alert card per crop -- all 3 share the
          // same physical ESP32/Wi-Fi connection, so they go down together.
          setDeviceAlerts((prev) => {
            const next = { ...prev };
            CROP_CONFIGS.forEach((cfg) => {
              next[cfg.key] = [buildConnectivityAlert(cfg), ...prev[cfg.key]];
            });
            return next;
          });
        }

        // Fall back to visible, clearly-labeled demo data instead of a
        // dead/blank screen -- never silently blended with real values
        // (connectivity: "demo" + the navbar indicator both flag it).
        setEspDemoMode(true);
        const mockSnapshot = getMockSensorSnapshot();
        setRealNodes((prev) => {
          const next = { ...prev };
          CROP_CONFIGS.forEach((cfg) => {
            const s = mockSnapshot[cfg.key];
            historyRefs.current[cfg.key] = [
              ...historyRefs.current[cfg.key],
              { t: Date.now(), moisture: s.moisture, temperature: s.temperature },
            ].slice(-200);
            next[cfg.key] = buildNode(
              cfg, s, historyRefs.current[cfg.key], "demo",
              deviceAlertsRef.current[cfg.key].filter((a) => a.status === "active")
            );
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
    const unsubTargets = subscribeTargets(
      (cropKey, row) => {
        if (row && row.target_moisture !== null) {
          setTargetMoistures((prev) => ({ ...prev, [cropKey]: row.target_moisture }));
        }
      },
      (reachable) => setSupabaseOk(reachable)
    );

    const unsubAI = subscribeAIDashboard(
      (cropKey, row) => {
        if (row) setAiDashboard((prev) => ({ ...prev, [cropKey]: row }));
      },
      (reachable) => setSupabaseOk(reachable)
    );

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

  // ── Alert dismiss (marks it hidden; auto-resolve on reconnect still
  //    happens separately if the alert is a connectivity one) ──────
  function handleDismissAlert(fieldId, alertId) {
    const cropKey = CROP_CONFIGS.find((cfg) => cfg.id === fieldId)?.key;
    if (!cropKey) return;
    setDeviceAlerts((prev) => ({
      ...prev,
      [cropKey]: prev[cropKey].map((a) => (a.id === alertId ? { ...a, status: "dismissed" } : a)),
    }));
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
    dismissAlert:     handleDismissAlert,
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
    // Demo fallback status
    isEspDemo:      espDemoMode,
    isSupabaseDemo: !supabaseOk,
    isDemoMode:     espDemoMode || !supabaseOk,
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

export function useAlertActions() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAlertActions must be used within SensorProvider");
  return { dismissAlert: ctx.dismissAlert };
}

export function useAIDashboard() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useAIDashboard must be used within SensorProvider");
  return ctx.aiDashboard;
}

// Whether any part of the app is currently showing demo/fallback data --
// isEspDemo when the ESP32 itself is unreachable (off, no Wi-Fi, wrong
// network), isSupabaseDemo when Supabase/the internet is unreachable
// (affects AI dashboard + target moisture sync). Drives the navbar badge.
export function useDemoStatus() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useDemoStatus must be used within SensorProvider");
  return { isEspDemo: ctx.isEspDemo, isSupabaseDemo: ctx.isSupabaseDemo, isDemoMode: ctx.isDemoMode };
}

export { SensorContext };
