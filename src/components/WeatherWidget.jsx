import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchFarmSettings } from "../data/supabaseService";
import { fetchCurrentWeather } from "../data/weatherService";
import { getWeatherIcon } from "../data/weatherIcons";

const REFRESH_MS = 15 * 60 * 1000; // weather doesn't change fast

// Big icon + plain label, deliberately not numbers-first -- built for
// farmers who may not read the app's text confidently, per the same
// design goal as the Nigerian-states dropdown in Settings (pick, don't type).
export default function WeatherWidget() {
  const navigate = useNavigate();
  const [status, setStatus]   = useState("loading"); // loading | ready | no-location | error
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const farm = await fetchFarmSettings();
        if (!farm?.latitude || !farm?.longitude) {
          if (!cancelled) setStatus("no-location");
          return;
        }
        if (!cancelled) setLocationName(farm.name ?? "");
        const w = await fetchCurrentWeather(farm.latitude, farm.longitude);
        if (!cancelled) { setWeather(w); setStatus("ready"); }
      } catch (err) {
        console.error("[WeatherWidget] Failed to load weather:", err.message);
        if (!cancelled) setStatus("error");
      }
    }

    load();
    const intervalId = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, []);

  if (status === "loading" || status === "error") return null; // non-critical widget, fail quiet

  if (status === "no-location") {
    return (
      <button
        onClick={() => navigate("/app/settings", { state: { tab: "devices" } })}
        className="w-full flex items-center gap-2.5 text-xs text-surface-400 bg-surface-100/60 border border-surface-200 rounded-xl px-4 py-3 mb-6 text-left hover:border-surface-300 hover:text-surface-600 transition-colors"
      >
        <span className="text-lg" role="img" aria-label="globe">🌍</span>
        <span className="underline underline-offset-2">Set your farm location in Settings</span>
        <span>to see live weather here.</span>
      </button>
    );
  }

  const { icon, label } = getWeatherIcon(weather.weatherCode);

  return (
    <div className="flex items-center gap-4 bg-gradient-to-r from-sky-50 to-surface-50 border border-surface-200 rounded-xl px-5 py-4 mb-6">
      <span className="text-5xl leading-none shrink-0" role="img" aria-label={label}>{icon}</span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-surface-900 leading-none">{label}</p>
        <p className="text-sm text-surface-500 mt-1.5">
          {Math.round(weather.temperature)}°C{locationName ? ` · ${locationName}` : ""}
        </p>
      </div>
    </div>
  );
}
