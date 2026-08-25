import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/ui/Card";
import StatusDot from "../components/ui/StatusDot";
import { useSensorData } from "../data/SensorContext";
import { fetchFarmSettings, writeFarmSettings } from "../data/supabaseService";
import { geocodeLocation } from "../data/geocodingService";
import { NIGERIAN_STATES } from "../data/nigerianStates";

const TABS = [
  { id: "account",       label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "devices",       label: "Fields & Devices" },
  { id: "actuation",     label: "Actuation" },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 shrink-0 ${
        checked ? "bg-accent" : "bg-surface-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Field({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-surface-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-surface-900 font-medium">{label}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5 leading-snug">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// Lets the farmer set THEIR OWN farm's location by picking a state, then a
// local government area (LGA) -- no typing, no address needed (deliberately,
// for farmers who may not read/type confidently). Saved to Supabase's
// farm_settings, which both the live weather widget and backend/src/
// weatherService.js read from.
function FarmLocationCard() {
  const [stateName, setStateName] = useState("");
  const [lgaName, setLgaName]     = useState("");
  const [saved, setSaved]         = useState(null); // { name, latitude, longitude } | null
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const stateEntry = NIGERIAN_STATES.find((s) => s.state === stateName);

  useEffect(() => {
    fetchFarmSettings()
      .then((row) => {
        if (row?.latitude != null) {
          setSaved(row);
          if (row.state) setStateName(row.state);
          if (row.lga) setLgaName(row.lga);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSave() {
    if (!stateEntry) { setError("Choose a state first"); return; }
    if (!lgaName) { setError("Choose a local government area"); return; }
    setSaving(true);
    setError("");
    try {
      let resolved;
      let usedFallback = false;
      try {
        // Most LGAs are administrative divisions, not "places" a geocoder
        // recognizes -- try it, but don't treat a miss as fatal.
        resolved = await geocodeLocation(`${lgaName}, Nigeria`, { countryCode: "NG" });
      } catch {
        // Falls back to the state capital, which always resolves -- still
        // regionally accurate for weather purposes, just less precise, so
        // say so rather than implying exact LGA-level precision below.
        resolved = await geocodeLocation(`${stateEntry.capital}, Nigeria`, { countryCode: "NG" });
        usedFallback = true;
      }
      const labeled = {
        ...resolved,
        state: stateEntry.state,
        lga: lgaName,
        name: usedFallback
          ? `${stateEntry.capital} (near ${lgaName}, ${stateEntry.state})`
          : `${lgaName}, ${stateEntry.state}`,
      };
      await writeFarmSettings(labeled);
      setSaved(labeled);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-4 mt-2 border-t border-surface-100">
      <p className="text-sm text-surface-900 font-medium mb-1">Farm location</p>
      <p className="text-xs text-surface-400 mb-3 leading-snug">
        Used for rain/heat forecasts in the AI's irrigation advice, and the weather widget on the dashboard. Pick your state, then your local government area.
      </p>
      <div className="flex flex-wrap gap-2 max-w-md">
        <select
          value={stateName}
          onChange={(e) => { setStateName(e.target.value); setLgaName(""); }}
          className="flex-1 min-w-[9rem] text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-surface-900 focus:outline-none focus:border-surface-400 hover:border-surface-300 transition-colors"
        >
          <option value="">Select state…</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s.state} value={s.state}>{s.state}</option>
          ))}
        </select>
        <select
          value={lgaName}
          onChange={(e) => setLgaName(e.target.value)}
          disabled={!stateEntry}
          className="flex-1 min-w-[9rem] text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-surface-900 focus:outline-none focus:border-surface-400 hover:border-surface-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{stateEntry ? "Select LGA…" : "Select state first"}</option>
          {stateEntry?.lgas.map((lga) => (
            <option key={lga} value={lga}>{lga}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={saving || !stateEntry || !lgaName}
          className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-semantic-red mt-2">{error}</p>}
      {saved && !error && (
        <p className="text-xs text-semantic-green mt-2">
          ✓ Weather connected to {saved.name}
        </p>
      )}
    </div>
  );
}

function InputRow({ label, type = "text", defaultValue, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-surface-500 block">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 hover:border-surface-300 transition-colors"
      />
    </div>
  );
}

export default function Settings() {
  const nodes = useSensorData();
  const routerLocation = useLocation();
  // Lands on a specific tab when navigated here with state, e.g. the
  // WeatherWidget's "set your farm location" link jumps straight to
  // Fields & Devices instead of the default Account tab.
  const [activeTab, setActiveTab]           = useState(routerLocation.state?.tab ?? "account");
  const [dash, setDash]                     = useState(true);
  const [whatsapp, setWhatsapp]             = useState(false);
  const [email, setEmail]                   = useState(false);
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [allowAuto, setAllowAuto]           = useState(false);

  return (
    <motion.div
      className="max-w-3xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden h-28 mb-5">
        <img
          src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80"
          alt="Farm settings"
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.5) brightness(0.85)" }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-900/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h2 className="text-xl font-bold text-white">Settings</h2>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">

        {/* ── Tab nav — horizontal scroll on mobile, vertical on sm+ ── */}
        <nav className="flex sm:flex-col gap-1 sm:gap-0.5 sm:space-y-0.5 sm:w-44 shrink-0 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`shrink-0 sm:w-full text-left px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-surface-200 text-surface-900 font-semibold"
                  : "text-surface-500 hover:text-surface-900 hover:bg-surface-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── Content panel ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >

              {activeTab === "account" && (
                <Card padding="lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-5">Account</p>
                  <div className="space-y-4 max-w-sm">
                    <InputRow label="Full name" defaultValue="Farmer Kalu" />
                    <InputRow label="Email address" type="email" defaultValue="farmer.kalu@soilguard.ag" />
                    <InputRow label="Password" type="password" defaultValue="••••••••" />
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                        Save changes
                      </button>
                      <button className="text-sm text-surface-400 hover:text-surface-700 transition-colors">
                        Log out
                      </button>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "notifications" && (
                <Card padding="lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-5">Notifications</p>
                  <Field label="Dashboard alerts" sub="In-app push notifications">
                    <Toggle checked={dash} onChange={setDash} />
                  </Field>
                  <Field label="WhatsApp alerts" sub="+234 801 234 5678 — works without strong internet">
                    <Toggle checked={whatsapp} onChange={setWhatsapp} />
                  </Field>
                  <Field label="Email digest" sub="Daily summary every morning">
                    <Toggle checked={email} onChange={setEmail} />
                  </Field>
                </Card>
              )}

              {activeTab === "devices" && (
                <Card padding="lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-5">Fields & Devices</p>
                  <div className="space-y-2">
                    {nodes.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-3 py-2.5 px-3 bg-surface-100/60 rounded-lg border border-surface-200 hover:border-surface-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusDot status={d.connectivity} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">{d.name}</p>
                            <p className="text-xs text-surface-400">
                              {d.id} &middot; Battery {d.battery.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <button className="shrink-0 text-xs text-semantic-red hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-semantic-red/30 rounded">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <FarmLocationCard />
                </Card>
              )}

              {activeTab === "actuation" && (
                <Card padding="lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-5">
                    Actuation Preferences
                  </p>
                  <Field
                    label="Require confirmation"
                    sub="Show a confirmation step before any pump actuation"
                  >
                    <Toggle checked={requireConfirm} onChange={setRequireConfirm} />
                  </Field>
                  <Field
                    label="Auto-correct minor issues"
                    sub={<span className="text-semantic-amber">Lets the system act without a manual click</span>}
                  >
                    <Toggle checked={allowAuto} onChange={setAllowAuto} />
                  </Field>
                  <p className="text-xs text-surface-400 leading-relaxed mt-5">
                    By design, SoilGuard defaults to manual confirmation. The AI informs and recommends
                    — the farmer retains authority over every actuation.
                  </p>
                </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
