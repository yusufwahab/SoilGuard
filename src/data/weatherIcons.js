// Maps Open-Meteo's WMO weather_code to a big, universally-recognizable
// emoji + plain-language label -- designed to be understandable at a
// glance, even for farmers who may not read the app's text confidently.
// Table: https://open-meteo.com/en/docs (WMO Weather interpretation codes)
const WEATHER_CODES = {
  0:  { icon: "☀️",  label: "Clear sky" },
  1:  { icon: "🌤️",  label: "Mostly clear" },
  2:  { icon: "⛅",  label: "Partly cloudy" },
  3:  { icon: "☁️",  label: "Overcast" },
  45: { icon: "🌫️",  label: "Foggy" },
  48: { icon: "🌫️",  label: "Foggy" },
  51: { icon: "🌦️",  label: "Light drizzle" },
  53: { icon: "🌦️",  label: "Drizzle" },
  55: { icon: "🌦️",  label: "Heavy drizzle" },
  56: { icon: "🌧️",  label: "Freezing drizzle" },
  57: { icon: "🌧️",  label: "Freezing drizzle" },
  61: { icon: "🌧️",  label: "Light rain" },
  63: { icon: "🌧️",  label: "Rain" },
  65: { icon: "🌧️",  label: "Heavy rain" },
  66: { icon: "🌧️",  label: "Freezing rain" },
  67: { icon: "🌧️",  label: "Freezing rain" },
  71: { icon: "🌨️",  label: "Light snow" },
  73: { icon: "🌨️",  label: "Snow" },
  75: { icon: "🌨️",  label: "Heavy snow" },
  77: { icon: "🌨️",  label: "Snow grains" },
  80: { icon: "🌦️",  label: "Rain showers" },
  81: { icon: "🌧️",  label: "Rain showers" },
  82: { icon: "⛈️",  label: "Violent showers" },
  85: { icon: "🌨️",  label: "Snow showers" },
  86: { icon: "🌨️",  label: "Snow showers" },
  95: { icon: "⛈️",  label: "Thunderstorm" },
  96: { icon: "⛈️",  label: "Thunderstorm + hail" },
  99: { icon: "⛈️",  label: "Severe thunderstorm" },
};

export function getWeatherIcon(code) {
  return WEATHER_CODES[code] ?? { icon: "🌡️", label: "Unknown" };
}
