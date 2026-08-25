// -----------------------------------------------------------------------
// LIVE WEATHER (frontend, via OpenWeatherMap -- needs a free API key)
// Fetches current conditions for the farm's saved location (set in
// Settings -> Fields & Devices), for the pictorial weather widget on the
// dashboard. Separate from backend/src/weatherService.js, which fetches
// its own copy server-side to feed the AI analysis prompt -- same
// provider, different consumer, kept independent so one can't break the
// other.
// -----------------------------------------------------------------------

export async function fetchCurrentWeather(latitude, longitude) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("VITE_OPENWEATHER_API_KEY not set");

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed (HTTP ${res.status})`);
  const data = await res.json();

  return {
    temperature: data.main?.temp,
    weatherCode: data.weather?.[0]?.id,
    description: data.weather?.[0]?.description,
  };
}
