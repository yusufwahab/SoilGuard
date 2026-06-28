import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: 1, label: "Name field" },
  { id: 2, label: "Crop type" },
  { id: 3, label: "Pair node" },
  { id: 4, label: "Notifications" },
  { id: 5, label: "Review" },
];

const CROPS = ["Maize", "Cassava", "Yam", "Cowpea", "Sorghum", "Groundnut", "Rice", "Millet"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fieldName, setFieldName] = useState("");
  const [location, setLocation] = useState("");
  const [crop, setCrop] = useState("");
  const [cropSearch, setCropSearch] = useState("");
  const [pairingPhase, setPairingPhase] = useState("idle");
  const [notifDash, setNotifDash] = useState(true);
  const [whatsapp, setWhatsapp] = useState("+234 ");

  const filteredCrops = CROPS.filter((c) =>
    c.toLowerCase().includes(cropSearch.toLowerCase())
  );

  function canContinue() {
    if (step === 1) return fieldName.trim().length > 0;
    if (step === 2) return crop.length > 0;
    if (step === 3) return pairingPhase === "paired";
    return true;
  }

  function handleContinue() {
    if (step === 3 && pairingPhase === "idle") {
      setPairingPhase("searching");
      setTimeout(() => setPairingPhase("found"), 1600);
      setTimeout(() => setPairingPhase("paired"), 2800);
      return;
    }
    if (step < 5) setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <p className="text-center text-sm font-semibold text-surface-900 tracking-tight mb-8 select-none">
          SoilGuard
        </p>

        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-semibold tabular-nums w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                    s.id === step
                      ? "bg-accent text-white"
                      : s.id < step
                      ? "bg-surface-200 text-surface-700"
                      : "text-surface-300 border border-surface-200"
                  }`}
                >
                  {s.id < step ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : s.id}
                </span>
                {/* Labels hidden on small screens */}
                <span
                  className={`hidden sm:block text-[10px] mt-1 whitespace-nowrap transition-colors ${
                    s.id === step ? "text-surface-700 font-medium" : "text-surface-300"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`w-5 sm:w-8 h-px mx-1 sm:mb-4 transition-colors ${
                    s.id < step ? "bg-surface-300" : "bg-surface-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Mobile step label */}
        <p className="sm:hidden text-center text-xs text-surface-500 -mt-4 mb-6">
          Step {step} of {STEPS.length} — {STEPS[step - 1].label}
        </p>

        {/* ── Card ── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 sm:p-6 shadow-sm">

          {/* Step 1 — Name the field */}
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-surface-900 mb-1">Name the field</h2>
              <p className="text-xs text-surface-400 mb-5 leading-relaxed">
                Give this field a recognisable name so you can find it on your dashboard.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-surface-500 block mb-1.5">Field name</label>
                  <input
                    autoFocus
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="e.g. North Field"
                    className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-500 block mb-1.5">
                    Location <span className="text-surface-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Near the river, south of the road"
                    className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Crop type */}
          {step === 2 && (
            <div>
              <h2 className="text-base font-semibold text-surface-900 mb-1">Select crop type</h2>
              <p className="text-xs text-surface-400 mb-4 leading-relaxed">
                This calibrates stress thresholds and AI recommendations to your specific crop.
              </p>
              <input
                autoFocus
                type="text"
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                placeholder="Search crops…"
                className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors mb-2"
              />
              <div className="max-h-44 overflow-y-auto space-y-0.5 rounded-lg border border-surface-200 p-1">
                {filteredCrops.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCrop(c)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors ${
                      crop === c
                        ? "bg-brand-50 text-brand-700 font-semibold"
                        : "text-surface-700 hover:bg-surface-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                {filteredCrops.length === 0 && (
                  <p className="text-xs text-surface-400 text-center py-4">No matches</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Pair the node */}
          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold text-surface-900 mb-1">Pair the node</h2>
              <p className="text-xs text-surface-400 mb-5 leading-relaxed">
                Make sure the ESP32 sensing node is powered on and in range.
              </p>

              {pairingPhase === "idle" && (
                <div className="py-6 text-center">
                  <p className="text-sm text-surface-500">Press Continue to scan for nearby nodes.</p>
                </div>
              )}

              {pairingPhase === "searching" && (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-accent rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-surface-500">Searching for node…</p>
                </div>
              )}

              {pairingPhase === "found" && (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-surface-900">
                    Node found: <span className="text-accent">SG-0231</span>
                  </p>
                  <p className="text-xs text-surface-400 mt-1">Connecting…</p>
                </div>
              )}

              {pairingPhase === "paired" && (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 bg-semantic-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9l4.5 4.5 7.5-7.5" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-semantic-green">Node SG-0231 paired</p>
                  <p className="text-xs text-surface-400 mt-1">Ready to start monitoring</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Notifications */}
          {step === 4 && (
            <div>
              <h2 className="text-base font-semibold text-surface-900 mb-1">Notification preferences</h2>
              <p className="text-xs text-surface-400 mb-5 leading-relaxed">
                Get alerted the moment a field needs attention.
              </p>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifDash}
                    onChange={(e) => setNotifDash(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded accent-accent"
                  />
                  <div>
                    <p className="text-sm font-medium text-surface-800">Dashboard alerts</p>
                    <p className="text-xs text-surface-400">In-app notifications</p>
                  </div>
                </label>
                <div>
                  <label className="flex items-start gap-3 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={!!whatsapp}
                      onChange={(e) => setWhatsapp(e.target.checked ? "+234 " : "")}
                      className="w-4 h-4 mt-0.5 rounded accent-accent"
                    />
                    <div>
                      <p className="text-sm font-medium text-surface-800">WhatsApp alerts</p>
                      <p className="text-xs text-surface-400">Works without strong internet or a data plan</p>
                    </div>
                  </label>
                  {whatsapp && (
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+234 801 234 5678"
                      className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div>
              <h2 className="text-base font-semibold text-surface-900 mb-1">Review & finish</h2>
              <p className="text-xs text-surface-400 mb-5">Confirm your setup before going live.</p>
              <div className="rounded-xl border border-surface-200 overflow-hidden">
                {[
                  { label: "Field name", value: fieldName || "—" },
                  { label: "Location",   value: location || "Not set" },
                  { label: "Crop",       value: crop || "—" },
                  { label: "Node",       value: "SG-0231" },
                  { label: "WhatsApp",   value: whatsapp || "Off" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-4 py-2.5 even:bg-surface-100/40 gap-4">
                    <span className="text-xs text-surface-500 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-surface-900 text-right truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button
                className="text-sm text-surface-400 hover:text-surface-700 transition-colors py-2"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                disabled={!canContinue() && !(step === 3 && pairingPhase === "idle")}
                onClick={handleContinue}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  canContinue() || (step === 3 && pairingPhase === "idle")
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "bg-surface-200 text-surface-400 cursor-not-allowed"
                }`}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => navigate("/app")}
                className="px-5 py-2.5 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Go to dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
