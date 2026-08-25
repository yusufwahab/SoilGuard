import { supabaseAdmin } from "./supabaseAdmin.js";

// -----------------------------------------------------------------------
// WEATHER (via OpenWeatherMap -- https://openweathermap.org, free tier:
// 1,000 calls/day, includes both endpoints used here)
// Gives the AI analysis current conditions + a 24h forecast for the farm's
// location, so it can factor "rain is coming" or "a heat spike is coming"
// into its irrigation decision, not just the last hour of sensor readings.
//
// Location comes from Supabase's farm_settings table -- the farmer sets
// it themselves in the frontend's Settings page (state + LGA dropdowns,
// geocoded client-side, saved to the DB). This backend never hardcodes
// one address, since different deployments/customers have different
// farms. FARM_LATITUDE/FARM_LONGITUDE env vars are only a fallback for
// before the farmer has set a location via Settings.
// -----------------------------------------------------------------------

const API_KEY = process.env.OPENWEATHER_API_KEY;

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

// Returns { current: {...}, next24h: {...} }, or null if no API key / no
// farm location is set anywhere (Supabase or env fallback), or if the
// fetch itself fails. Callers should treat a null return as "proceed
// without weather context" -- never let a weather outage block the
// sensor-based analysis.
export async function fetchWeatherSummary() {
  if (!API_KEY) {
    console.warn("[Weather] OPENWEATHER_API_KEY not set -- analysis will proceed without weather context.");
    return null;
  }

  const location = await getFarmLocation();
  if (!location) {
    console.warn("[Weather] No farm location set -- add one in the app's Settings page. Analysis will proceed without weather context.");
    return null;
  }

  if (weatherCache && Date.now() - weatherCachedAt < WEATHER_CACHE_TTL_MS) return weatherCache;

  const { lat, lon } = location;
  const [currentRes, forecastRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
  ]);
  if (!currentRes.ok) throw new Error(`OpenWeatherMap current-weather responded ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`OpenWeatherMap forecast responded ${forecastRes.status}`);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  // 3-hourly entries; first 8 = next 24h
  const next24 = forecast.list.slice(0, 8);
  const rainAmounts = next24.map((e) => e.rain?.["3h"] ?? 0);
  const rainChances = next24.map((e) => (e.pop ?? 0) * 100);
  const temps       = next24.map((e) => e.main.temp);

  const summary = {
    current: {
      temperature: round(current.main?.temp),
      humidity: round(current.main?.humidity),
      cloudCoverPct: round(current.clouds?.all),
      precipitationMm: round(current.rain?.["1h"] ?? 0, 2),
    },
    next24h: {
      maxRainChancePct: round(Math.max(...rainChances)),
      totalExpectedRainMm: round(rainAmounts.reduce((a, b) => a + b, 0), 1),
      tempMin: round(Math.min(...temps)),
      tempMax: round(Math.max(...temps)),
    },
  };

  weatherCache = summary;
  weatherCachedAt = Date.now();
  return summary;
}
