// -----------------------------------------------------------------------
// LIVE WEATHER (frontend, via Open-Meteo -- free, no API key)
// Fetches current conditions for the farm's saved location (set in
// Settings -> Fields & Devices), for the pictorial weather widget on the
// dashboard. Separate from backend/src/weatherService.js, which fetches
// its own copy server-side to feed the AI analysis prompt -- same
// provider, different consumer, kept independent so one can't break the
// other.
// -----------------------------------------------------------------------

export async function fetchCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (HTTP ${res.status})`);
  const data = await res.json();
  return {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
  };
}
