import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until .env.local has the Supabase URL and anon key. */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Browser client. The anon key is safe to expose: Row Level Security in
 * supabase/schema.sql decides what each visitor can read or write.
 */
export const supabase = createClient(url ?? "http://localhost:54321", anonKey ?? "missing-anon-key");

/** Server-side client for API routes (no session storage). */
export function serverClient() {
  return createClient(url ?? "http://localhost:54321", anonKey ?? "missing-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
