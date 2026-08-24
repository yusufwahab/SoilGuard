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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
// every future insert/update/delete. Returns an unsubscribe function.
export function subscribeTargets(onChange) {
  supabase.from("targets").select("*").then(({ data, error }) => {
    if (error) { console.error("[Supabase] targets fetch:", error.message); return; }
    data?.forEach((row) => onChange(row.crop_key, row));
  });

  const channel = supabase
    .channel("targets-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "targets" }, (payload) => {
      const row = payload.eventType === "DELETE" ? null : payload.new;
      const cropKey = row?.crop_key ?? payload.old?.crop_key;
      if (cropKey) onChange(cropKey, row);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── AI Dashboard (populated by backend/ -- see backend/src/analyze.js) ─
export function subscribeAIDashboard(onChange) {
  supabase.from("ai_dashboard").select("*").then(({ data, error }) => {
    if (error) { console.error("[Supabase] ai_dashboard fetch:", error.message); return; }
    data?.forEach((row) => onChange(row.crop_key, row));
  });

  const channel = supabase
    .channel("ai-dashboard-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_dashboard" }, (payload) => {
      const row = payload.eventType === "DELETE" ? null : payload.new;
      const cropKey = row?.crop_key ?? payload.old?.crop_key;
      if (cropKey) onChange(cropKey, row);
    })
    .subscribe();

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
