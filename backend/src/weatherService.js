// -----------------------------------------------------------------------
// WEATHER (via Open-Meteo -- https://open-meteo.com, free, no API key)
// Gives the AI analysis current conditions + a 24h forecast for the farm's
// location, so it can factor "rain is coming" or "a heat spike is coming"
// into its irrigation decision, not just the last hour of sensor readings.
// -----------------------------------------------------------------------

const LAT = process.env.FARM_LATITUDE;
const LON = process.env.FARM_LONGITUDE;

const CACHE_TTL_MS = 15 * 60 * 1000; // weather doesn't change fast; avoid
                                       // refetching 3x per scheduled run
                                       // (once per crop) or every manual trigger.
let cache = null;
let cachedAt = 0;

function round(v, d = 1) {
  return v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d;
}

// Returns { current: {...}, next24h: {...} }, or null if farm coordinates
// aren't configured, or if the fetch itself fails. Callers should treat a
// null return as "proceed without weather context" -- never let a weather
// outage block the sensor-based analysis.
export async function fetchWeatherSummary() {
  if (!LAT || !LON) {
    console.warn("[Weather] FARM_LATITUDE/FARM_LONGITUDE not set -- analysis will proceed without weather context.");
    return null;
  }

  if (cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover` +
    `&hourly=precipitation_probability,precipitation,temperature_2m` +
    `&forecast_days=2&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const data = await res.json();

  const next24Precip = data.hourly.precipitation.slice(0, 24);
  const next24Prob    = data.hourly.precipitation_probability.slice(0, 24);
  const next24Temp     = data.hourly.temperature_2m.slice(0, 24);

  const summary = {
    current: {
      temperature: round(data.current.temperature_2m),
      humidity: round(data.current.relative_humidity_2m),
      cloudCoverPct: round(data.current.cloud_cover),
      precipitationMm: round(data.current.precipitation, 2),
    },
    next24h: {
      maxRainChancePct: round(Math.max(...next24Prob)),
      totalExpectedRainMm: round(next24Precip.reduce((a, b) => a + b, 0), 1),
      tempMin: round(Math.min(...next24Temp)),
      tempMax: round(Math.max(...next24Temp)),
    },
  };

  cache = summary;
  cachedAt = Date.now();
  return summary;
}
