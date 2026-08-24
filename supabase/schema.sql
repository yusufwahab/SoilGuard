-- SoilGuard -- Supabase schema (replaces Firebase Realtime Database)
--
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- Scope: this backs ONLY the internet-OK layer (AI dashboard, target
-- moisture/autopilot, node lifecycle, historical sensor logging for
-- charts). The ESP32 itself never talks to this database -- it stays
-- fully local-only, same as before.
--
-- Security note: this app has no real user auth yet (Login.jsx is UI-only
-- right now, mirrors how the previous Firebase rules were wide open too),
-- so the policies below allow the public "anon" key to read/write freely.
-- Tighten this once real auth is wired up.

-- ── AI Dashboard (written by backend/, via its Gemini->Groq->Claude chain) ──
create table if not exists ai_dashboard (
  crop_key               text primary key,        -- 'rice' | 'beans' | 'yam'
  farmer_message         text,
  recommended_target     numeric,
  fungi_risk_score       numeric,                  -- 0-10
  fungi_advice           text,
  material_health_status text,
  decision               text,                     -- IRRIGATE | POSTPONE | MONITOR | ALERT
  corrosion_risk_score   numeric,                  -- 0-10
  sensor_health_pct      numeric,
  updated_at             timestamptz not null default now()
);

-- ── Target moisture / autopilot setting (per crop) ───────────────────
create table if not exists targets (
  crop_key          text primary key,
  target_moisture   numeric,        -- null = autopilot disabled
  autopilot_enabled boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- ── Node lifecycle metadata (2yr tracker) ─────────────────────────────
create table if not exists devices (
  id              text primary key,   -- e.g. 'SG-RICE'
  crop_key        text not null unique,
  name            text not null,
  installed_at    date not null default current_date,
  lifecycle_years numeric not null default 2,
  notes           text
);

insert into devices (id, crop_key, name) values
  ('SG-RICE',  'rice',  'Rice Paddy'),
  ('SG-BEANS', 'beans', 'Beans Field'),
  ('SG-YAM',   'yam',   'Yam Plot')
on conflict (id) do nothing;

-- ── Historical sensor readings (logged by the frontend as it polls the
--    ESP32 locally -- gives AI Dashboard/History charts real persistence
--    across sessions instead of resetting on every page refresh) ───────
create table if not exists sensor_readings (
  id          bigint generated always as identity primary key,
  crop_key    text not null,
  moisture    numeric,
  temperature numeric,
  humidity    numeric,
  pump_status boolean,
  recorded_at timestamptz not null default now()
);
create index if not exists sensor_readings_crop_time_idx
  on sensor_readings (crop_key, recorded_at desc);

-- ── Row Level Security -- open policies (no auth in the app yet) ─────
alter table ai_dashboard    enable row level security;
alter table targets         enable row level security;
alter table devices         enable row level security;
alter table sensor_readings enable row level security;

-- ai_dashboard is written ONLY by backend/ (using the service role key,
-- which bypasses RLS entirely) -- the frontend/browser only ever reads it,
-- so no public write policy here.
create policy "public read ai_dashboard"   on ai_dashboard    for select using (true);

create policy "public read targets"        on targets         for select using (true);
create policy "public write targets"       on targets         for all    using (true) with check (true);

create policy "public read devices"        on devices         for select using (true);
create policy "public write devices"       on devices         for all    using (true) with check (true);

create policy "public read sensor_readings"  on sensor_readings for select using (true);
create policy "public insert sensor_readings" on sensor_readings for insert with check (true);

-- ── Realtime -- so the frontend gets live updates the same way Firebase's
--    onValue() used to push them ────────────────────────────────────────
alter publication supabase_realtime add table ai_dashboard;
alter publication supabase_realtime add table targets;
