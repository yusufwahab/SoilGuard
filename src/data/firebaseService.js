const BASE = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms";

export async function fetchSensor(crop) {
  const res = await fetch(`${BASE}/${crop}/sensor.json`);
  if (!res.ok) throw new Error(`[Firebase] ${crop}/sensor fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`%c[Firebase] ${crop}/sensor.json`, "color:#16a34a;font-weight:bold", data);
  return data;
}

export async function fetchPumpState(crop) {
  const res = await fetch(`${BASE}/${crop}/pump_state.json`);
  if (!res.ok) throw new Error(`[Firebase] ${crop}/pump_state fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`%c[Firebase] ${crop}/pump_state.json`, "color:#0284c7;font-weight:bold", data);
  return data;
}

export async function writePumpState(crop, state) {
  const res = await fetch(`${BASE}/${crop}/pump_state.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state), // "ON" or "OFF"
  });
  if (!res.ok) throw new Error(`[Firebase] ${crop}/pump_state write failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchTargetMoisture(crop) {
  const res = await fetch(`${BASE}/${crop}/target_moisture.json`);
  if (!res.ok) throw new Error(`[Firebase] ${crop}/target_moisture fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`%c[Firebase] ${crop}/target_moisture.json`, "color:#d97706;font-weight:bold", data);
  return data;
}

export async function writeTargetMoisture(crop, value) {
  const res = await fetch(`${BASE}/${crop}/target_moisture.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`[Firebase] ${crop}/target_moisture write failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchAIDashboard(crop) {
  const res = await fetch(`${BASE}/${crop}/ai_dashboard.json`);
  if (!res.ok) throw new Error(`[Firebase] ${crop}/ai_dashboard fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`%c[Firebase] ${crop}/ai_dashboard.json`, "color:#7c3aed;font-weight:bold", data);
  return data;
}
