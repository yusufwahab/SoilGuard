const BASE = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms/rice";

export async function fetchSensorData() {
  const res = await fetch(`${BASE}/sensor.json`);
  if (!res.ok) throw new Error(`Firebase sensor fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log("%c[Firebase] sensor.json", "color:#16a34a;font-weight:bold", data);
  return data;
}

export async function fetchPumpState() {
  const res = await fetch(`${BASE}/pump_state.json`);
  if (!res.ok) throw new Error(`Firebase pump fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log("%c[Firebase] pump_state.json", "color:#0284c7;font-weight:bold", data);
  return data;
}

export async function writePumpState(state) {
  const res = await fetch(`${BASE}/pump_state.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state), // sends "ON" or "OFF"
  });
  if (!res.ok) throw new Error(`Firebase pump write failed: HTTP ${res.status}`);
  return res.json();
}

const FARM_BASE = "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com/farms";

export async function fetchAIDashboard(crop) {
  const res = await fetch(`${FARM_BASE}/${crop}/ai_dashboard.json`);
  if (!res.ok) throw new Error(`Firebase AI dashboard fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  console.log(`%c[Firebase] ${crop}/ai_dashboard.json`, "color:#7c3aed;font-weight:bold", data);
  return data;
}
