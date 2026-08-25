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

-- ── Farm location (set by the farmer via Settings -> Fields & Devices --
--    a dropdown of Nigerian states, geocoded to that state's capital via
--    Open-Meteo, not hardcoded per-deployment). This is what lets the
--    weather integration work for whichever customer's farm this actually
--    is, instead of one address baked into a config file. Single row for
--    now (one farm per deployment); swap the fixed id for a real farm_id
--    if this ever needs to serve multiple farms from one backend.
create table if not exists farm_settings (
  id         text primary key default 'default',
  name       text,
  latitude   numeric,
  longitude  numeric,
  updated_at timestamptz not null default now()
);

insert into farm_settings (id) values ('default') on conflict (id) do nothing;

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
alter table farm_settings   enable row level security;
alter table sensor_readings enable row level security;

-- create policy has no IF NOT EXISTS in Postgres, so drop-then-create is
-- what actually makes this file safe to re-run (unlike create table, this
-- errors on a second run without the drop first -- learned that the hard
-- way once already).
--
-- ai_dashboard is written ONLY by backend/ (using the service role key,
-- which bypasses RLS entirely) -- the frontend/browser only ever reads it,
-- so no public write policy here.
drop policy if exists "public read ai_dashboard" on ai_dashboard;
create policy "public read ai_dashboard"   on ai_dashboard    for select using (true);

drop policy if exists "public read targets" on targets;
drop policy if exists "public write targets" on targets;
create policy "public read targets"        on targets         for select using (true);
create policy "public write targets"       on targets         for all    using (true) with check (true);

drop policy if exists "public read devices" on devices;
drop policy if exists "public write devices" on devices;
create policy "public read devices"        on devices         for select using (true);
create policy "public write devices"       on devices         for all    using (true) with check (true);

-- farm_settings -- written directly by the frontend (Settings page), so it
-- needs a public write policy same as targets/devices (unlike ai_dashboard).
drop policy if exists "public read farm_settings" on farm_settings;
drop policy if exists "public write farm_settings" on farm_settings;
create policy "public read farm_settings"  on farm_settings   for select using (true);
create policy "public write farm_settings" on farm_settings   for all    using (true) with check (true);

drop policy if exists "public read sensor_readings" on sensor_readings;
drop policy if exists "public insert sensor_readings" on sensor_readings;
create policy "public read sensor_readings"  on sensor_readings for select using (true);
create policy "public insert sensor_readings" on sensor_readings for insert with check (true);

-- ── Realtime -- so the frontend gets live updates the same way Firebase's
--    onValue() used to push them. ADD TABLE has no IF NOT EXISTS either,
--    so check pg_publication_tables first to keep this re-runnable. ─────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_dashboard'
  ) then
    alter publication supabase_realtime add table ai_dashboard;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'targets'
  ) then
    alter publication supabase_realtime add table targets;
  end if;
end $$;
