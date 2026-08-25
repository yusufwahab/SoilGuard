// -----------------------------------------------------------------------
// GEOCODING (via Open-Meteo's free Geocoding API -- no key needed)
// Turns a typed location name ("Minna, Niger State") into coordinates,
// so each farmer can set their own farm's location through Settings
// instead of one address hardcoded per deployment. Same provider as
// backend/src/weatherService.js, just the lookup half.
// -----------------------------------------------------------------------

export async function geocodeLocation(query, { countryCode } = {}) {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Enter a location to search for");

  const params = new URLSearchParams({ name: trimmed, count: "1", language: "en", format: "json" });
  if (countryCode) params.set("countryCode", countryCode);

  const url = `https://geocoding-api.open-meteo.com/v1/search?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed (HTTP ${res.status})`);

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`No location found for "${trimmed}" -- try a nearby town or city instead`);

  const label = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
  return { name: label, latitude: result.latitude, longitude: result.longitude };
}
