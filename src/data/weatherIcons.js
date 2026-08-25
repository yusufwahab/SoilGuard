// Maps OpenWeatherMap's condition code to a big, universally-recognizable
// emoji + plain-language label -- designed to be understandable at a
// glance, even for farmers who may not read the app's text confidently.
// Table: https://openweathermap.org/weather-conditions
export function getWeatherIcon(code) {
  if (code == null) return { icon: "🌡️", label: "Unknown" };
  if (code >= 200 && code < 300) return { icon: "⛈️", label: "Thunderstorm" };
  if (code >= 300 && code < 400) return { icon: "🌦️", label: "Drizzle" };
  if (code >= 500 && code < 600) return { icon: code < 502 ? "🌦️" : "🌧️", label: "Rain" };
  if (code === 781) return { icon: "🌪️", label: "Tornado" };
  if (code >= 600 && code < 700) return { icon: "🌨️", label: "Snow" };
  if (code >= 700 && code < 800) return { icon: "🌫️", label: "Hazy / Foggy" };
  if (code === 800) return { icon: "☀️", label: "Clear sky" };
  if (code === 801) return { icon: "🌤️", label: "Few clouds" };
  if (code === 802) return { icon: "⛅", label: "Scattered clouds" };
  if (code >= 803) return { icon: "☁️", label: "Overcast" };
  return { icon: "🌡️", label: "Unknown" };
}
