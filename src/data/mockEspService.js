// -----------------------------------------------------------------------
// DEMO SENSOR SIMULATOR
// Used ONLY as a visible fallback when the real ESP32 can't be reached
// (no Wi-Fi, device off, wrong network). Generates believable drifting
// values for the same three real crop slots, in the exact shape
// espService.fetchAllSensors() returns, so a demo still looks alive
// without hardware -- always clearly flagged via connectivity: "demo"
// plus the navbar indicator, never silently blended in as real data.
// -----------------------------------------------------------------------

const CROPS = ["rice", "beans", "yam"];

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function drift(current, step, min, max) {
  return clamp(current + (Math.random() - 0.5) * step * 2, min, max);
}

// Module-level so values keep drifting smoothly across polls instead of
// re-randomizing from scratch every call.
const state = {
  rice:  { moisture: 58, temperature: 27.5, humidity: 68, pumpStatus: 0 },
  beans: { moisture: 42, temperature: 28.2, humidity: 64, pumpStatus: 0 },
  yam:   { moisture: 50, temperature: 26.8, humidity: 70, pumpStatus: 0 },
};

export function getMockSensorSnapshot() {
  const snapshot = {};
  CROPS.forEach((crop) => {
    const s = state[crop];
    s.moisture    = drift(s.moisture, 0.6, 15, 85);
    s.temperature = drift(s.temperature, 0.15, 20, 36);
    s.humidity    = drift(s.humidity, 0.4, 40, 90);

    // Occasionally flip the pump so the demo feels alive, not static.
    if (Math.random() > 0.985) s.pumpStatus = s.pumpStatus ? 0 : 1;

    snapshot[crop] = {
      moisture: Number(s.moisture.toFixed(0)),
      temperature: Number(s.temperature.toFixed(1)),
      humidity: Number(s.humidity.toFixed(0)),
      pumpStatus: s.pumpStatus,
    };
  });
  return snapshot;
}
