import { supabaseAdmin } from "./supabaseAdmin.js";

// -----------------------------------------------------------------------
// WEATHER (via Open-Meteo -- https://open-meteo.com, free, no API key)
// Gives the AI analysis current conditions + a 24h forecast for the farm's
// location, so it can factor "rain is coming" or "a heat spike is coming"
// into its irrigation decision, not just the last hour of sensor readings.
//
// Location comes from Supabase's farm_settings table -- the farmer sets
// it themselves in the frontend's Settings page (types a place name,
// geocoded client-side, saved to the DB). This backend never hardcodes
// one address, since different deployments/customers have different
// farms. FARM_LATITUDE/FARM_LONGITUDE env vars are only a fallback for
// before the farmer has set a location via Settings.
// -----------------------------------------------------------------------

const WEATHER_CACHE_TTL_MS  = 15 * 60 * 1000; // weather doesn't change fast; avoid
                                                // refetching 3x per scheduled run
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;   // short enough to pick up a Settings change soon

let weatherCache = null;
let weatherCachedAt = 0;
let locationCache = null; // { lat, lon } | null
let locationCachedAt = 0;

function round(v, d = 1) {
  return v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d;
}

async function getFarmLocation() {
  if (locationCache !== null && Date.now() - locationCachedAt < LOCATION_CACHE_TTL_MS) return locationCache;

  const { data, error } = await supabaseAdmin
    .from("farm_settings")
    .select("latitude, longitude")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.warn("[Weather] Failed to read farm_settings from Supabase:", error.message);
  }

  let lat = data?.latitude;
  let lon = data?.longitude;

  // Fallback to env vars if the farmer hasn't set a location in Settings yet
  if (lat == null || lon == null) {
    lat = process.env.FARM_LATITUDE ? Number(process.env.FARM_LATITUDE) : null;
    lon = process.env.FARM_LONGITUDE ? Number(process.env.FARM_LONGITUDE) : null;
  }

  locationCache = (lat != null && lon != null) ? { lat, lon } : null;
  locationCachedAt = Date.now();
  return locationCache;
}

// Returns { current: {...}, next24h: {...} }, or null if no farm location
// is set anywhere (Supabase or env fallback), or if the fetch itself
// fails. Callers should treat a null return as "proceed without weather
// context" -- never let a weather outage block the sensor-based analysis.
export async function fetchWeatherSummary() {
  const location = await getFarmLocation();
  if (!location) {
    console.warn("[Weather] No farm location set -- add one in the app's Settings page. Analysis will proceed without weather context.");
    return null;
  }

  if (weatherCache && Date.now() - weatherCachedAt < WEATHER_CACHE_TTL_MS) return weatherCache;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
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

  weatherCache = summary;
  weatherCachedAt = Date.now();
  return summary;
}
