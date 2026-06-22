# SoilGuard — Frontend UI/UX Build Prompt

---n the build.md

## 0. CONTEXT — WHAT THIS SOFTWARE IS FOR

SoilGuard is a hardware-software system for Nigerian smallholder farmers. A field-deployed **ESP32 sensing node** (capacitive soil moisture probe, pH sensor, EC sensor, DHT22 temp/humidity sensor) runs off a solar + 18650 battery loop and pushes readings to this web dashboard when online, buffering locally when offline.

The software's job is to take those four raw readings and turn them into two predictions:

1. **Crop Stress Predictor** — threshold/trend-based forecast of nutrient lock-out or water stress, with a "days-to-impact" estimate.
2. **Corrosion Index Calculator** — Langelier Saturation Index (LSI) and Ryznar Stability Index (RSI), turned into a corrosion severity score and an estimated remaining service life for buried metal irrigation infrastructure.

When either prediction crosses a threshold, the backend calls the **Claude API** with sensor context and returns a plain-language recommendation, shown as a "prescription card." The farmer can then trigger a **dual-tank actuation system** directly from the dashboard: Tank A (plain water, for moisture deficit) or Tank B (dilute lime solution, for pH correction). The system then watches the sensor in real time to confirm the correction landed, closing the loop.

The UI is therefore not a generic IoT dashboard — it is a **diagnosis-to-action interface**: see the problem, understand why, see what AI recommends, act on it, watch it get fixed. Every screen should reflect that narrative arc.

---

## 1. DESIGN PHILOSOPHY (read this before building anything)

This must feel like a **premium agri-tech instrument**, not a hobbyist IoT dashboard and not a SaaS template. Think the restraint of Linear, the typographic confidence of Stripe's docs, the data calm of a Bloomberg terminal redesigned by an editorial designer — applied to soil and infrastructure data.

**Hard rules:**

- No decorative gradients anywhere. Flat color fields only. (A single, subtle radial glow behind a hero headline on the landing page is the _only_ permitted exception — nowhere else.)
- No icon soup. Icons are used only for navigation wayfinding and a small set of recurring system states (online/offline, alert, success). Never decorative icons next to every label or stat.
- No "color riot" — one neutral base palette (warm off-white / near-black, like stone and charcoal, not pure white/black) plus exactly **one accent color** used sparingly for primary actions and the brand mark, plus a restrained semantic triad (amber for warning, red for critical, green for healthy/resolved) used ONLY on status indicators — never decoratively.
- Typography carries the hierarchy, not boxes/borders/shadows. Default to large, confident numerals for data (a tabular/monospace numeral style for all sensor readings so digits don't jiggle as they update), and a clean grotesque or humanist sans for everything else. Two type families maximum.
- Generous whitespace. Density comes from layout rhythm and alignment, not from cramming.
- Motion is purposeful and minimal: numbers tick/count up when a reading updates, a status dot pulses gently when live, charts animate in once on load — nothing bounces, nothing has elastic easing, nothing spins except an actual loading indicator.
- Borders/dividers are 1px, hairline, low-contrast. Cards are differentiated by spacing and a faint border or background tint shift — not heavy shadows.
- Every screen should answer one question at a glance before requiring a click: "is everything fine, or do I need to act?"

**Tell your AI assistant explicitly:** build with React (JavaScript, no TypeScript — `.jsx` files, no type annotations, no `.tsx`) and Tailwind CSS. Use Tailwind's default spacing/type scale extended with custom CSS variables for the brand palette and the tabular numeral font. Use a charting library that supports smooth real-time updates (e.g. Recharts) for line/area charts of sensor history.

---

## 2. WHERE THE HARDWARE FITS IN (so the AI doesn't try to build firmware)

The AI assistant is building **only the web dashboard** (frontend). It should treat the hardware layer as a data source behind an API/WebSocket boundary it does not need to implement, but the UI must visibly account for it:

- **Connectivity state is a first-class UI element.** Because nodes are solar-powered and offline-first, every screen showing live data needs a persistent, unobtrusive indicator of: Live (actively streaming), Buffered/Syncing (node is offline, last-known data being shown, will sync on reconnect), or Offline (no recent contact, with "last seen" timestamp).
- **Battery/solar state** for each node is a small but always-visible stat (battery %, charging from solar yes/no) — this is hardware health, distinct from soil health, and should never be visually merged with the sensor readings.
- **Actuation buttons are physical-world commands.** Clicking "Correct pH" doesn't just update UI state — it triggers a relay that pumps real lime solution into real soil. The UI must treat this with the gravity of a real-world action: confirmation step, visible "in progress" state while the pump runs, and a verified-by-sensor completion state (not just "command sent" but "command sent → executing → confirmed by sensor reading").
- **Mock/simulate the data layer** with a small local module that emits realistic, slowly-drifting sensor values and occasionally crosses a threshold to trigger the alert/recommendation/actuation flow, so the UI is fully demonstrable without real hardware connected. Build it so swapping this for a real WebSocket/API later is a one-file change.

---

## 3. INFORMATION ARCHITECTURE / NAVIGATION

Primary navigation is a **slim left sidebar** (collapsible to icon-only on smaller widths), not a top nav bar — this is a working tool, used in sessions, not browsed page to page.

Sidebar contains, top to bottom:

- Wordmark/logomark (small, no large hero logo inside the app)
- **Overview** (all-fields dashboard)
- **Fields** (list of all deployed nodes/fields)
- **Alerts** (AI recommendations + history)
- **History & Analytics**
- Divider
- **Settings**
- A persistent account/profile control pinned at the bottom (avatar + farmer name + a small chevron opening a menu: Account, Notification channels, Log out)

A **global top strip** (not a heavy navbar, just a thin bar) sits above the page content and contains: the current page title, a global connectivity summary ("3 of 4 nodes online"), and a notification bell with unread-alert count.

There is also a **public marketing/landing page** (logged-out state) — separate visual treatment, see Page 1.

---

## 4. PAGE-BY-PAGE SPECIFICATION

### Page 1 — Public Landing Page (logged out)

Purpose: explain the system to a stakeholder/judge/investor in under a minute, then funnel to login.

- **Hero section:** Large, confident headline (e.g. framing SoilGuard as the system that predicts crop and infrastructure failure before it happens). Subheadline, one sentence. Two buttons: primary "View Dashboard" (→ login), secondary "How it works" (anchor-scrolls down). This is the one place a subtle radial glow/gradient behind the headline is allowed, using the single accent color at low opacity. Below the headline, show a live-feeling preview: a static but polished mockup of the dashboard's main chart + a prescription card, slightly tilted or in a clean device-less frame.
- **Problem section:** Two-column layout — left: short copy on the agronomic crisis (soil acidity, invisible damage); right: short copy on the metallurgical crisis (corrosion eating infrastructure). Visually paired to show this is one problem with two faces.
- **How it works section:** A horizontal 5-step flow rendered as a clean numbered sequence (not icons-in-circles cliché): Detect → Diagnose → Prescribe → Actuate → Verify. Each step gets a one-line description. This is a flow diagram, treat it as information design, not decoration.
- **Dual-prediction explainer:** Side-by-side cards: "Crop Stress Predictor" and "Corrosion Index Calculator," each with a one-line description and a sample reading (e.g. a sample days-to-impact number, a sample remaining-service-life number) styled exactly as they'd appear in the real dashboard — this previews the product's actual visual language.
- **Hardware section:** A clean, labelled diagram-style section (not a glossy product photo) showing the sensing node, solar/battery loop, and dual-tank actuator as a simple annotated layout — reinforcing that this is real hardware, not just software.
- **Footer:** Minimal — wordmark, a couple of links, no clutter.

### Page 2 — Login / Sign In

- Centered card on the neutral background, no split-screen marketing imagery — keep it quiet and functional.
- Email + password fields, "Sign in" primary button, "Forgot password" link.
- No social-login icon rows; if needed, a single understated "Continue with Google" text-button below a hairline divider labelled "or."
- First-time users land here too: a small text link "New to SoilGuard? Set up your first field" → Page 3.

### Page 3 — Onboarding / Device Pairing Wizard

A focused, single-column, step-indicator-driven wizard (steps shown as small numbered labels at the top, not a thick progress bar). Steps:

1. **Name the field** — text input, optional location/farm name.
2. **Select crop type** — a clean searchable select (maize, cassava, etc.) — this drives the Crop Stress Predictor's thresholds.
3. **Pair the node** — instructions for connecting the ESP32 node's WiFi (simulate this as a short "Searching for node… → Node found: SG-0231" sequence with a calm progress state, then a confirmation).
4. **Notification preferences** — toggle dashboard alerts on/off, and an input to add a WhatsApp number for alert delivery (explain in one line that WhatsApp alerts work without an app or strong internet).
5. **Review & finish** — summary of the above, "Go to dashboard" primary button.

Each step has a "Back" text-link and a primary "Continue" button. No modal — full focused page, since this is a setup flow.

### Page 4 — Overview Dashboard (default page after login)

This is the command-center view across all fields/nodes.

- **Top of page:** A row of compact summary stat cards — Total fields monitored, Active alerts, Average corrosion risk across infrastructure, Nodes online. These are quiet stat blocks: large tabular numeral, small label beneath, no icon, no card border heaviness — just enough separation via spacing and a faint background tint.
- **Field cards grid:** Below, a grid of cards, one per field/node. Each card shows: field name + crop type, a small live-status dot (green pulsing = live, amber = buffered, grey = offline), the four current readings as compact mini-stats (moisture %, pH, EC, temp), and a slim horizontal status bar with two small labelled segments: "Crop Stress" and "Corrosion Risk," each colored along the green→amber→red semantic scale based on current severity. Clicking anywhere on the card → Page 5 (Field Detail) for that field.
- If there's an active unresolved alert for a field, the card gets a single small "Action needed" tag in the amber/red semantic color, top-right of the card — this is the only place urgency is visually flagged on this page, deliberately understated so it doesn't compete with the data itself.
- **Empty state** (no fields yet): centered message + "Add your first field" button → Page 3.

### Page 5 — Field Detail Page

This is the most important screen — the full diagnostic view for one field/node.

- **Header row:** Field name, crop type, live-status indicator with "last updated Xs ago," and a small overflow menu (rename field, view node hardware info, remove field).
- **Hardware health strip:** a slim, visually distinct row (different background tint from the rest of the page) showing battery %, solar charging state, signal/connectivity, and node ID — clearly separated from soil data so the two layers of information are never confused.
- **Live readings row:** Four large stat blocks — Moisture, Soil pH, EC, Temperature/Humidity — each with the current value in large tabular numerals, a tiny sparkline of the last hour beneath it, and a one-word qualitative tag (Normal / Watch / Critical) in the semantic color, text-only, no badge background unless critical.
- **Dual-prediction panel:** Two side-by-side panels (stacking on mobile):
  - **Crop Stress Predictor** panel: current status sentence (plain language, e.g. trend direction and what's at risk), a "days to impact" large numeral if a trend is active, and a small trend line chart of the relevant reading (e.g. pH) with a visually marked threshold line.
  - **Corrosion Index** panel: current LSI/RSI-derived severity score shown as a simple horizontal gauge (a thin bar, not a gauge dial/speedometer graphic — avoid skeuomorphism), the estimated remaining infrastructure service life as a large numeral with unit (e.g. months), and a one-line plain explanation of what's driving the score.
- **Historical chart section:** A full-width multi-line chart with a time-range selector (24h / 7d / 30d) showing moisture, pH, EC, temperature as togglable lines (small text toggles above the chart, not a cluttered legend with default-all-on lines fighting for attention — let the user isolate one).
- **Active Recommendation card** (only shown if there's a live unresolved alert): this is the prescription card. Contains: a short plain-language headline of the issue, the full AI-generated recommendation text, the source reasoning shown as 2–3 small labelled data points it was derived from (e.g. "pH trend: −1.2 over 8 days," "Crop: Maize," "Season: dry"), and one or two primary action buttons matching the recommendation — e.g. "Dispense lime (Tank B)" and/or "Irrigate (Tank A)" — plus a quiet "Dismiss" text-link for farmers who will act manually and don't need the system to track it. Clicking an action button → Actuation Confirmation Modal (Section 5).
- If no active alert: this panel is replaced with a calm, minimal "All conditions normal" state — no big green checkmark icon, just quiet typography confirming health, so the page doesn't feel empty or broken when things are fine.

### Page 6 — Alerts

A chronological list (not cards-in-a-grid — a list, since this is a log) of all past and present alerts across all fields.

- Each row: field name, timestamp, short alert headline, status tag (Active / Resolved / Dismissed) in semantic color, and a chevron to expand.
- Expanding a row inline-reveals the same prescription card content as on the Field Detail page (recommendation text, reasoning data points, action buttons if still active, or a "Resolved — confirmed by sensor at [time]" note if closed).
- A simple filter row at the top: by field (select), by status (segmented control: All / Active / Resolved), by type (Crop stress / Corrosion) — text-based filter pills, not heavy dropdown chrome.

### Page 7 — History & Analytics

For reviewing trends over longer periods and across fields, more analytical than the Field Detail page's live focus.

- A field selector (or "All fields" aggregate) and date range selector at the top.
- A primary large chart area (toggle between Soil Trends and Corrosion Trends as two tabs above the chart).
- Below the chart, a compact summary row: average readings over the period, number of alerts triggered, number of actuations performed, estimated water/lime used — plain stat blocks, same visual language as the Overview page stats.
- This page is about pattern recognition over time, so charts dominate; minimize any other chrome.

### Page 8 — Settings

A simple settings layout: a left-hand in-page sub-nav (Account, Notifications, Fields & Devices, Actuation Preferences) with content on the right. Key content:

- **Account:** name, email, password change, log out.
- **Notifications:** toggle dashboard push, toggle WhatsApp alerts with the configured number, toggle email digest — each as a clean labelled row with a switch control, no extra icon per row.
- **Fields & Devices:** a list of all paired nodes with their hardware IDs, battery health, and a "Remove device" action per row (behind a confirmation modal).
- **Actuation Preferences:** a toggle for "Require confirmation before any actuation" (default on) and a toggle for "Allow automatic actuation for minor corrections" (default off, with a one-line warning that this lets the system act without a manual click) — this directly reflects the proposal's design principle that the AI informs but the farmer retains authority, so default state must always favor manual confirmation.

---

## 5. MODALS

Use modals only for short, focused decisions — never to replace a page that has independent content worth a URL.

- **Actuation Confirmation Modal** (triggered from a recommendation card's action button): Shows exactly what will happen ("Tank B will dispense ~150ml of lime solution into Field 2"), the reasoning in one line, and two buttons: primary "Confirm & Dispense," secondary "Cancel." After confirming, the modal transitions in place (no new modal) through three states without closing: "Sending command…" → "Pump running… Xs remaining" (a slim progress bar, not a spinner) → "Done — verifying with sensor…" → finally collapses into a success state with the new reading and a "Close" button. If verification fails (reading didn't move as expected) it shows a calm, clear message suggesting manual inspection, not an alarming error state.
- **Add Field / Pair New Device Modal:** A condensed version of the onboarding wizard's pairing step, used when adding an additional field after initial setup, accessible from the Overview page's "+ Add field" button (placed quietly at the end of the field-cards grid, styled as a dashed-border ghost card matching the grid, not a separate floating action button).
- **Remove Device Confirmation Modal:** Plain text confirmation, destructive action styled in the red semantic color only on the confirm button text, not the whole modal.
- **Recommendation Detail Modal** is NOT used — recommendation detail is shown inline/expanded on the page (Field Detail and Alerts pages), not in a modal, since the user often needs to reference the chart behind it while deciding.

---

## 6. KEY INTERACTION / BUTTON BEHAVIOR NOTES

- Primary buttons: solid fill in the single accent color, no gradient, subtle darken on hover, no shadow lift.
- Secondary buttons: outline or ghost text-style, never a second competing fill color.
- Destructive actions (remove device, dismiss critical alert) use red only in the button label/border, never a solid red fill block, to keep the palette restrained — reserve solid red fill for nothing; even critical states should be communicated through typography and the status dot/tag system, not big red panels.
- Live numbers (sensor readings) should visibly tick/count when they update via the simulated data stream, on a multi-second interval — this is the one place subtle motion reinforces the "this is alive and real" feeling of the product.
- Status dot animation: a slow, soft pulse (not a hard blink) for "live," static for buffered/offline.
- All forms validate inline, under the field, in small text — no toast-stacking for form errors.
- Use toasts sparingly and only for background/system events the user didn't directly initiate from a visible control (e.g. "Field 3 has reconnected" after being offline) — never for confirming a direct action that already has its own visible state change.

---

## 7. WHAT TO BUILD FIRST

Tell the AI assistant to build in this order so there's always something demoable:

1. Design tokens/theme setup in Tailwind config (palette, type scale, the tabular-numeral font stack).
2. Sidebar + top strip + routing shell (use React Router) with all pages as empty routes.
3. Simulated live-data module (mock WebSocket/interval-based generator with realistic drift and an occasional threshold breach).
4. Overview page + Field Detail page (the core loop).
5. Actuation Confirmation Modal flow tied to the mock data so the full detect→diagnose→prescribe→actuate→verify loop is demoable end to end.
6. Alerts, History & Analytics, Settings, Onboarding, Landing page — in that order.

**Reminder to the AI assistant:** This is a JavaScript React project — `.jsx` files, no TypeScript, no type annotations, no `.tsx` files, plain PropTypes or no prop typing at all is fine. Use Tailwind CSS for all styling.
