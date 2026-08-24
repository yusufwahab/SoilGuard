import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(url && serviceRoleKey);

if (!supabaseConfigured) {
  console.warn(
    "[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set -- " +
    "analysis routes will error until you copy .env.example to .env and fill it in."
  );
}

// Server-side client using the SERVICE ROLE key -- this bypasses RLS.
// It must NEVER be sent to a browser; it only ever lives in this backend's
// environment. This is intentionally a different client than the
// frontend's src/data/supabaseService.js, which uses the public anon key.
//
// createClient() validates its URL eagerly and throws if it's missing, so
// an unconfigured .env would otherwise crash the whole process at import
// time. Falling back to a placeholder lets the server still boot (health
// check works); any actual query then fails with a normal network/auth
// error at request time instead, caught like any other Supabase error.
export const supabaseAdmin = createClient(
  url || "https://placeholder.invalid",
  serviceRoleKey || "placeholder-key"
);
