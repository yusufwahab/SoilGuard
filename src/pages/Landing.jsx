import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Grain from "../components/Grain";
import Reveal from "../components/ui/Reveal";
import Section from "../components/ui/Section";
import StatBlock from "../components/ui/StatBlock";
import Card from "../components/ui/Card";

/* ─── Hardware system diagram ──────────────────────────────────── */
function HardwareDiagram() {
  const S = "#e9e4db";   // structure lines
  const A = "#16a34a";   // accent / active data-flow
  const T = "#3a3429";   // text
  const M = "#9a8c75";   // muted labels
  const F = "#faf8f5";   // box fill
  const FT = "#f5f2ed";  // tinted fill

  return (
    <div className="border border-surface-200 rounded-2xl bg-surface-50 overflow-hidden p-4 md:p-6">
      <svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" className="w-full" fill="none">
        <defs>
          <marker id="ah-a" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={A} />
          </marker>
          <marker id="ah-s" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={S} />
          </marker>
        </defs>

        {/* ─── ESP32 Node ─── */}
        <rect x="22" y="22" width="190" height="130" rx="10" stroke={S} fill={FT} />
        <text x="117" y="42" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2.5" fill={M} fontFamily="Inter,sans-serif">ESP32 NODE</text>

        {/* Sensor chips */}
        {[
          { x: 35,  l: "pH",  f: "#d1fae5", s: "#6ee7b7" },
          { x: 82,  l: "EC",  f: "#fef9c3", s: "#fde047" },
          { x: 129, l: "H₂O", f: "#dbeafe", s: "#93c5fd" },
          { x: 176, l: "T/RH",f: "#fce7f3", s: "#f9a8d4" },
        ].map((chip) => (
          <g key={chip.l}>
            <rect x={chip.x} y="52" width="38" height="28" rx="4" fill={chip.f} stroke={chip.s} strokeWidth="1" />
            <text x={chip.x + 19} y="70" textAnchor="middle" fontSize="9" fontWeight="700" fill={T} fontFamily="JetBrains Mono,monospace">
              {chip.l}
            </text>
          </g>
        ))}

        {/* ESP32 main chip */}
        <rect x="76" y="94" width="68" height="44" rx="5" fill={T} />
        <text x="110" y="113" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={F} fontFamily="JetBrains Mono,monospace">ESP32</text>
        <text x="110" y="128" textAnchor="middle" fontSize="7" fill="#9a8c75" fontFamily="JetBrains Mono,monospace">WiFi + BLE</text>

        {/* Probe dashes going into soil */}
        {[54, 101, 148, 196].map((px) => (
          <line key={px} x1={px} y1="152" x2={px} y2="218" stroke={S} strokeWidth="1" strokeDasharray="2 3" />
        ))}

        {/* ─── Solar + Battery ─── */}
        <rect x="22" y="162" width="190" height="50" rx="10" stroke="#fbbf24" strokeWidth="1" fill="#fffbeb" />
        <text x="117" y="181" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#d97706" fontFamily="Inter,sans-serif">☀ SOLAR + 18650</text>
        <rect x="34"  y="188" width="74" height="16" rx="3" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1" />
        <text x="71" y="200" textAnchor="middle" fontSize="7.5" fill="#d97706" fontFamily="Inter,sans-serif" fontWeight="600">Charging</text>
        <rect x="120" y="188" width="44" height="16" rx="3" fill={FT} stroke={S} />
        <rect x="164" y="193" width="4" height="6" rx="1" fill={S} />
        <rect x="122" y="190" width="24" height="12" rx="2" fill={A} opacity="0.45" />
        <text x="142" y="200" textAnchor="middle" fontSize="7.5" fill={T} fontFamily="JetBrains Mono,monospace" fontWeight="700">78%</text>

        {/* Power line up to ESP32 */}
        <line x1="117" y1="162" x2="117" y2="152" stroke={S} strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#ah-s)" />
        <text x="125" y="160" fontSize="7.5" fill={M} fontFamily="Inter,sans-serif">power</text>

        {/* ─── WiFi arc: Node → Dashboard ─── */}
        <path d="M 212 95 C 295 55, 375 55, 460 95" stroke={A} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#ah-a)" />
        <text x="336" y="50" textAnchor="middle" fontSize="8" fontWeight="700" fill={A} fontFamily="Inter,sans-serif" letterSpacing="1">WiFi / cloud sync</text>

        {/* ─── Dashboard ─── */}
        <rect x="460" y="22" width="218" height="130" rx="10" stroke={S} fill={FT} />
        <text x="569" y="42" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2.5" fill={M} fontFamily="Inter,sans-serif">DASHBOARD + AI</text>

        {/* Browser chrome */}
        <rect x="472" y="50" width="194" height="92" rx="6" stroke={S} fill={F} />
        <rect x="472" y="50" width="194" height="16" rx="6" fill={S} stroke="none" />
        <rect x="472" y="56" width="194" height="10" fill={S} stroke="none" />
        <circle cx="484" cy="58" r="3" fill="#b8ad99" />
        <circle cx="495" cy="58" r="3" fill="#b8ad99" />
        <circle cx="506" cy="58" r="3" fill="#b8ad99" />

        {/* Mini chart bars */}
        {[{x:480,h:20,c:S},{x:492,h:32,c:"#d6cec0"},{x:504,h:14,c:S},{x:516,h:26,c:A}].map((b,i) => (
          <rect key={i} x={b.x} y={130-b.h} width="9" height={b.h} rx="2" fill={b.c} opacity="0.7" />
        ))}

        {/* Prescription card */}
        <rect x="532" y="70" width="124" height="64" rx="5" fill={F} stroke="#f59e0b" strokeWidth="1.5" />
        <rect x="532" y="70" width="4" height="64" rx="2" fill="#f59e0b" />
        <text x="542" y="85" fontSize="7" fontWeight="700" fill="#f59e0b" letterSpacing="1.2" fontFamily="Inter,sans-serif">AI PRESCRIPTION</text>
        <text x="542" y="98" fontSize="7" fill={T} fontFamily="Inter,sans-serif">pH is 4.8 — acidity risk</text>
        <rect x="542" y="104" width="68" height="14" rx="3" fill={A} />
        <text x="576" y="115" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="white" fontFamily="Inter,sans-serif">Dispense Tank B</text>
        <text x="542" y="131" fontSize="7" fill="#b8ad99" fontFamily="Inter,sans-serif">Maize · pH trend −1.2 / 8d</text>

        {/* ─── Relay command: Dashboard → Actuator ─── */}
        <line x1="569" y1="152" x2="569" y2="170" stroke={A} strokeWidth="1.5" markerEnd="url(#ah-a)" />
        <text x="580" y="165" fontSize="7.5" fontWeight="600" fill={A} fontFamily="Inter,sans-serif">relay</text>

        {/* ─── Actuator ─── */}
        <rect x="460" y="170" width="218" height="60" rx="10" stroke={S} fill={FT} />
        <text x="569" y="190" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2.5" fill={M} fontFamily="Inter,sans-serif">DUAL ACTUATOR</text>

        <rect x="472" y="196" width="90" height="26" rx="5" fill="#eff6ff" stroke="#0284c7" strokeWidth="1" />
        <text x="517" y="213" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0284c7" fontFamily="Inter,sans-serif">TANK A — water</text>

        <rect x="574" y="196" width="90" height="26" rx="5" fill="#f0fdf4" stroke={A} strokeWidth="1.5" />
        <text x="619" y="213" textAnchor="middle" fontSize="8" fontWeight="700" fill={A} fontFamily="Inter,sans-serif">TANK B — lime aq.</text>

        {/* Feedback: tanks → soil */}
        <path d="M 517 222 L 517 232 L 350 232 L 350 218 L 250 218" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#ah-s)" />
        <path d="M 619 222 L 619 240 L 290 240 L 290 218 L 250 218" stroke={A} strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#ah-s)" />

        {/* ─── Soil line ─── */}
        <line x1="22" y1="218" x2="250" y2="218" stroke={S} strokeWidth="1.5" />
        <text x="136" y="237" textAnchor="middle" fontSize="8" letterSpacing="3.5" fill={M} fontFamily="Inter,sans-serif" fontWeight="600">FIELD SOIL</text>
      </svg>
    </div>
  );
}

/* ─── Inline dashboard preview (hero) ─────────────────────────── */
function DashboardPreview() {
  const cards = [
    { name: "North Field",    crop: "Maize",   m: 48.2, pH: 6.1, ec: 1.34, st: "live",     s: 12, c: 18 },
    { name: "Riverbank Plot", crop: "Cassava", m: 22.7, pH: 5.1, ec: 2.71, st: "live",     s: 68, c: 72, alert: true },
    { name: "Hill Terrace",   crop: "Maize",   m: 55.0, pH: 6.8, ec: 1.10, st: "buffered", s: 5,  c: 9 },
  ];
  const dot = (s) => s === "live" ? "bg-semantic-green" : s === "buffered" ? "bg-semantic-amber" : "bg-surface-300";
  const bar = (v) => v > 66 ? "bg-semantic-red" : v > 33 ? "bg-semantic-amber" : "bg-semantic-green";

  return (
    <div className="relative mx-auto max-w-4xl mt-14 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 5 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      >
        <div
          className="bg-surface-50 border border-surface-200/80 rounded-2xl overflow-hidden"
          style={{
            transform: "rotateX(5deg) rotateY(-1.5deg)",
            boxShadow: "0 50px 120px rgba(22,30,20,0.15), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          {/* Browser chrome */}
          <div className="bg-surface-100 border-b border-surface-200 px-4 py-2.5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-surface-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-surface-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-surface-300" />
            </div>
            <div className="flex-1 bg-surface-200/70 rounded h-5 max-w-xs mx-auto" />
          </div>

          {/* App layout */}
          <div className="flex" style={{ minHeight: "300px" }}>
            {/* Sidebar */}
            <div className="w-36 border-r border-surface-200 bg-surface-50 p-3 shrink-0">
              <div className="h-3.5 w-16 bg-surface-900/80 rounded mb-5" />
              {["Overview","Fields","Alerts","History"].map((l) => (
                <div key={l} className={`flex items-center gap-2 px-2 py-1.5 rounded mb-0.5 ${l === "Overview" ? "bg-brand-50" : ""}`}>
                  <div className={`w-3 h-3 rounded ${l === "Overview" ? "bg-brand-400" : "bg-surface-200"}`} />
                  <div className={`h-2 rounded flex-1 ${l === "Overview" ? "bg-brand-200" : "bg-surface-200"}`} />
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="flex-1 p-4 bg-surface-50/60">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-16 bg-surface-900/70 rounded" />
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-semantic-green" />
                  <div className="h-2 w-20 bg-surface-200 rounded" />
                </div>
              </div>
              {/* Stat row */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[{v:"4",l:"Fields"},{v:"2",l:"Alerts",a:true},{v:"34%",l:"Corrosion"},{v:"3/4",l:"Online"}].map((s) => (
                  <div key={s.l} className="bg-surface-100/60 border border-surface-200 rounded-lg px-2 py-1.5">
                    <p className={`font-mono text-sm font-bold tabular-nums ${s.a ? "text-semantic-amber" : "text-surface-900"}`}>{s.v}</p>
                    <p className="text-[8px] text-surface-400 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
              {/* Field cards */}
              <div className="grid grid-cols-3 gap-2">
                {cards.map((c) => (
                  <div key={c.name} className={`bg-surface-50 border rounded-lg p-2 relative ${c.alert ? "border-semantic-amber/40" : "border-surface-200"}`}>
                    {c.alert && <span className="absolute top-1.5 right-1.5 text-[7px] font-bold text-semantic-amber uppercase">Action</span>}
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot(c.st)}`} />
                      <span className="text-[9px] font-bold text-surface-900 truncate">{c.name}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-0.5 mb-1.5">
                      {[{v:`${c.m.toFixed(0)}%`,l:"H₂O"},{v:c.pH.toFixed(1),l:"pH"},{v:c.ec.toFixed(1),l:"EC"},{v:"29°",l:"T"}].map((r) => (
                        <div key={r.l}>
                          <p className="font-mono text-[8px] font-bold tabular-nums text-surface-900">{r.v}</p>
                          <p className="text-[7px] text-surface-400">{r.l}</p>
                        </div>
                      ))}
                    </div>
                    {[c.s,c.c].map((v,i) => (
                      <div key={i} className="h-0.5 w-full bg-surface-200 rounded-full overflow-hidden mb-0.5">
                        <div className={`h-full rounded-full ${bar(v)}`} style={{width:`${v}%`}} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating prescription card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -bottom-5 right-8 bg-surface-50 border border-surface-200 rounded-xl p-3.5 shadow-xl w-60"
        style={{ borderLeft: "3px solid #f59e0b" }}
      >
        <p className="text-[8px] font-bold uppercase tracking-widest text-semantic-amber mb-1">Crop stress alert</p>
        <p className="text-[11px] font-bold text-surface-900 mb-1">pH acidity risk — Riverbank</p>
        <p className="text-[10px] text-surface-500 mb-2 leading-relaxed">Apply dilute lime via Tank B. 4 days to impact.</p>
        <div className="flex gap-2 items-center">
          <span className="text-[9px] bg-accent text-white px-2 py-0.5 rounded-md font-bold">Dispense lime (Tank B)</span>
          <span className="text-[9px] text-surface-400">Dismiss</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Section label ────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 text-center mb-3">
      {children}
    </p>
  );
}

/* ─── Landing ───────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <Grain />

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-200 bg-surface-50/95 backdrop-blur-sm sticky top-0 z-40">
        <span className="text-sm font-bold tracking-tight select-none">SoilGuard</span>
        <div className="flex items-center gap-5">
          <a href="#how" className="text-sm text-surface-500 hover:text-surface-900 transition-colors">How it works</a>
          <a href="#hardware" className="text-sm text-surface-500 hover:text-surface-900 transition-colors hidden sm:block">Hardware</a>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-1.5 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pt-20 pb-36 text-center overflow-hidden bg-surface-50">
        {/* Permitted radial glow */}
        <div className="absolute inset-0 flex items-start justify-center pointer-events-none" aria-hidden>
          <div
            className="w-[800px] h-[500px] mt-4 rounded-full"
            style={{ background: "radial-gradient(ellipse at center, rgba(22,163,74,0.08) 0%, transparent 68%)" }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <motion.p
            className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
          >
            Agri-tech sensing system — Nigeria
          </motion.p>
          <motion.h1
            className="text-5xl sm:text-[4rem] font-bold tracking-tight text-surface-900 leading-[1.06] mb-5"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.22,1,0.36,1] }}
          >
            Predict soil failure<br className="hidden sm:block" /> before it costs you
          </motion.h1>
          <motion.p
            className="text-lg text-surface-500 max-w-lg mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: [0.22,1,0.36,1] }}
          >
            Field-deployed sensors + AI-driven diagnostics that protect Nigerian smallholder crops
            and buried irrigation infrastructure from invisible damage.
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.22,1,0.36,1] }}
          >
            <button
              onClick={() => navigate("/login")}
              className="px-5 py-2.5 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              View Dashboard
            </button>
            <a
              href="#how"
              className="px-5 py-2.5 text-sm font-bold text-surface-600 border border-surface-200 rounded-lg hover:border-surface-300 hover:text-surface-900 transition-colors"
            >
              How it works
            </a>
          </motion.div>
        </div>

        <DashboardPreview />
      </section>

      {/* ── Problem ── */}
      <Section tinted>
        <Reveal>
          <SectionLabel>Two silent crises, one system</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 text-center mb-12 tracking-tight">
            What SoilGuard sees that you can&rsquo;t
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-6">

          {/* Agronomic */}
          <Reveal delay={0.08}>
            <div className="rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 h-full">
              <div className="relative h-52 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80"
                  alt="West African farmland"
                  className="w-full h-full object-cover"
                  style={{ filter: "saturate(0.55) brightness(1.05)" }}
                  loading="lazy"
                />
                {/* Warm brand tint overlay */}
                <div className="absolute inset-0" style={{ background: "rgba(22,163,74,0.06)", mixBlendMode: "multiply" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-50/95 via-surface-50/20 to-transparent" />
              </div>
              <div className="px-6 pb-6 -mt-2 relative">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-2">The agronomic crisis</p>
                <h3 className="text-base font-bold text-surface-900 mb-2">Soil acidity destroys yields invisibly</h3>
                <p className="text-sm text-surface-600 leading-relaxed">
                  Nigerian smallholder farmers lose up to 40% of potential harvest to pH imbalance and
                  nutrient lockout — conditions undetectable until crop damage has already occurred.
                  SoilGuard catches the trend before it becomes a loss.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Metallurgical */}
          <Reveal delay={0.16}>
            <div className="rounded-2xl overflow-hidden border border-surface-200 bg-surface-50 h-full">
              <div className="relative h-52 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80"
                  alt="Irrigation infrastructure"
                  className="w-full h-full object-cover"
                  style={{ filter: "saturate(0.45) brightness(1.0)" }}
                  loading="lazy"
                />
                <div className="absolute inset-0" style={{ background: "rgba(22,163,74,0.04)", mixBlendMode: "multiply" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-50/95 via-surface-50/20 to-transparent" />
              </div>
              <div className="px-6 pb-6 -mt-2 relative">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-2">The metallurgical crisis</p>
                <h3 className="text-base font-bold text-surface-900 mb-2">Corrosion eats infrastructure underground</h3>
                <p className="text-sm text-surface-600 leading-relaxed">
                  Buried galvanized steel corrodes when soil conductivity and pH go unmonitored. Infrastructure
                  failure costs months of income. SoilGuard tracks Langelier and Ryznar indices in real time
                  so you replace pipes on your schedule, not in a crisis.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section id="how">
        <Reveal>
          <SectionLabel>The loop</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 text-center mb-14 tracking-tight">
            From sensor to correction in one flow
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-4">
          {[
            { n: "01", label: "Detect",    desc: "ESP32 node reads moisture, pH, EC, and temperature every 10 seconds from the field." },
            { n: "02", label: "Diagnose",  desc: "Threshold models and trend analysis identify stress and corrosion risk in real time." },
            { n: "03", label: "Prescribe", desc: "Claude API generates a plain-language recommendation with full source reasoning." },
            { n: "04", label: "Actuate",   desc: "One tap dispatches Tank A (water) or Tank B (lime solution) to the affected field." },
            { n: "05", label: "Verify",    desc: "The sensor confirms the correction. The loop closes with a reading update." },
          ].map((item, i) => (
            <Reveal key={item.n} delay={i * 0.08}>
              <div className="relative">
                <div className="text-xs font-bold text-accent mb-2 tabular-nums">{item.n}</div>
                <h4 className="text-sm font-bold text-surface-900 mb-2">{item.label}</h4>
                <p className="text-xs text-surface-500 leading-relaxed">{item.desc}</p>
                {i < 4 && <div className="hidden sm:block absolute -right-2 top-3 text-surface-300 text-xs select-none">→</div>}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Dual prediction ── */}
      <Section tinted>
        <Reveal>
          <SectionLabel>Two predictions</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 text-center mb-12 tracking-tight">
            One system, two kinds of intelligence
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-5">
          <Reveal delay={0.08}>
            <Card padding="lg" className="h-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-4">Crop Stress Predictor</p>
              <p className="text-sm text-surface-600 leading-relaxed mb-6">
                Threshold and trend-based forecasting of nutrient lockout and water stress, with
                days-to-impact estimates calibrated to your specific crop type.
              </p>
              <StatBlock label="days to impact" value="4" valueSize="4xl" />
              <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden mt-2 mb-1">
                <div className="h-full w-3/5 bg-semantic-amber rounded-full" />
              </div>
              <p className="text-[10px] text-surface-400">pH acidity risk — Maize, dry season</p>
            </Card>
          </Reveal>
          <Reveal delay={0.16}>
            <Card padding="lg" className="h-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-4">Corrosion Index Calculator</p>
              <p className="text-sm text-surface-600 leading-relaxed mb-6">
                Langelier and Ryznar index-derived severity and estimated remaining service life for
                buried galvanized steel irrigation infrastructure.
              </p>
              <StatBlock label="months service life remaining" value="18" valueSize="4xl" valueColor="text-semantic-amber" />
              <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden mt-2 mb-1">
                <div className="h-full w-2/5 bg-semantic-red rounded-full" />
              </div>
              <p className="text-[10px] text-surface-400">LSI: +0.87 — EC is the primary driver</p>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* ── Hardware ── */}
      <Section id="hardware">
        <Reveal>
          <SectionLabel>Hardware</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 text-center mb-12 tracking-tight">
            Real sensors. Real soil. Real-time.
          </h2>
        </Reveal>
        <Reveal delay={0.1} y={16}>
          <HardwareDiagram />
        </Reveal>
        <div className="grid grid-cols-3 gap-6 mt-8">
          {[
            { label: "ESP32 Sensing Node",  desc: "Capacitive moisture, pH, EC probe, DHT22 temp/humidity. Solar-powered and offline-first." },
            { label: "Solar + 18650 Battery", desc: "Charges in sunlight, runs through the night. Buffers readings locally when offline." },
            { label: "Dual-Tank Actuator",  desc: "Tank A: plain water for moisture deficit. Tank B: dilute lime for pH correction." },
          ].map((h, i) => (
            <Reveal key={h.label} delay={i * 0.07}>
              <div>
                <p className="text-xs font-bold text-surface-900 mb-1.5">{h.label}</p>
                <p className="text-[11px] text-surface-500 leading-relaxed">{h.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section tinted narrow>
        <Reveal>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3 tracking-tight">
              Start monitoring your fields
            </h2>
            <p className="text-sm text-surface-500 mb-8 leading-relaxed max-w-sm mx-auto">
              Set up your first sensing node in minutes and get your first AI recommendation the same day.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 text-sm font-bold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={() => navigate("/onboarding")}
                className="px-6 py-2.5 text-sm font-bold text-surface-600 border border-surface-200 rounded-lg hover:border-surface-300 hover:text-surface-900 transition-colors"
              >
                Set up a field
              </button>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-200 px-8 py-5 bg-surface-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs font-bold text-surface-500 select-none">SoilGuard</span>
          <span className="text-xs text-surface-400">Predicting crop and infrastructure failure before it costs you.</span>
        </div>
      </footer>
    </div>
  );
}
