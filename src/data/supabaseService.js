import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------
// SUPABASE (replaces Firebase Realtime Database)
// Backs ONLY the internet-OK layer -- AI dashboard, target moisture /
// autopilot, node lifecycle, and historical sensor logging for charts.
// The ESP32 never talks to this; it stays fully local-only.
// See supabase/schema.sql for the tables this expects.
// -----------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set -- " +
    "AI dashboard + target moisture will show demo data until .env is filled in."
  );
}

// createClient() validates its URL eagerly and throws if it's missing --
// without a fallback, an unconfigured .env would crash the ENTIRE app at
// import time (a blank white screen), not just fall back to demo mode as
// intended. The placeholder lets the app boot normally; the queries in
// this file then fail at request time like any other network error, which
// SensorContext's onStatus callbacks already turn into the demo-mode
// fallback (see useDemoStatus / the navbar "Demo Data" badge).
export const supabase = createClient(
  supabaseUrl || "https://placeholder.invalid",
  supabaseAnonKey || "placeholder-key"
);

// ── Target moisture / autopilot ───────────────────────────────────────
export async function writeTargetMoisture(cropKey, value) {
  const { error } = await supabase.from("targets").upsert({
    crop_key: cropKey,
    target_moisture: value,
    autopilot_enabled: value !== null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// Fetches current rows once, then streams live changes. Calls
// onChange(cropKey, row | null) for each row, both immediately and on
// every future insert/update/delete. `onStatus(reachable)` (optional)
// reports whether Supabase is actually reachable -- lets callers detect
// "internet/Supabase is down" and fall back to demo data, same idea as
// the ESP32 poll failure fallback. Returns an unsubscribe function.
export function subscribeTargets(onChange, onStatus) {
  supabase.from("targets").select("*")
    .then(({ data, error }) => {
      if (error) { console.error("[Supabase] targets fetch:", error.message); onStatus?.(false); return; }
      onStatus?.(true);
      data?.forEach((row) => onChange(row.crop_key, row));
    })
    .catch((err) => { console.error("[Supabase] targets fetch:", err.message); onStatus?.(false); });

  const channel = supabase
    .channel("targets-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "targets" }, (payload) => {
      const row = payload.eventType === "DELETE" ? null : payload.new;
      const cropKey = row?.crop_key ?? payload.old?.crop_key;
      if (cropKey) onChange(cropKey, row);
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus?.(false);
      else if (status === "SUBSCRIBED") onStatus?.(true);
    });

  return () => supabase.removeChannel(channel);
}

// ── AI Dashboard (populated by backend/ -- see backend/src/analyze.js) ─
export function subscribeAIDashboard(onChange, onStatus) {
  supabase.from("ai_dashboard").select("*")
    .then(({ data, error }) => {
      if (error) { console.error("[Supabase] ai_dashboard fetch:", error.message); onStatus?.(false); return; }
      onStatus?.(true);
      data?.forEach((row) => onChange(row.crop_key, row));
    })
    .catch((err) => { console.error("[Supabase] ai_dashboard fetch:", err.message); onStatus?.(false); });

  const channel = supabase
    .channel("ai-dashboard-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_dashboard" }, (payload) => {
      const row = payload.eventType === "DELETE" ? null : payload.new;
      const cropKey = row?.crop_key ?? payload.old?.crop_key;
      if (cropKey) onChange(cropKey, row);
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus?.(false);
      else if (status === "SUBSCRIBED") onStatus?.(true);
    });

  return () => supabase.removeChannel(channel);
}

// ── Historical sensor readings (logged as the frontend polls the ESP32) ─
export async function insertSensorReading(cropKey, reading) {
  const { error } = await supabase.from("sensor_readings").insert({
    crop_key: cropKey,
    moisture: reading.moisture,
    temperature: reading.temperature,
    humidity: reading.humidity,
    pump_status: reading.pumpStatus === 1,
  });
  if (error) console.error("[Supabase] Failed to log sensor reading:", error.message);
}

// ── Node lifecycle metadata ────────────────────────────────────────────
export async function fetchDevices() {
  const { data, error } = await supabase.from("devices").select("*");
  if (error) throw error;
  return data;
}

export async function upsertDevice(device) {
  const { error } = await supabase.from("devices").upsert(device);
  if (error) throw error;
}
