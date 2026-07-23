import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Treat the example placeholders as "not configured" so the app doesn't try
// to reach a fake project. Real credentials flip this to true automatically.
const isPlaceholder =
  !url ||
  !anonKey ||
  url.includes("your-project-ref") ||
  anonKey.startsWith("your-");

export const isSupabaseConfigured = !isPlaceholder;

// When Supabase isn't really configured, fall back to a local demo dataset so
// the layout is still viewable. Turns off automatically once real keys are set.
export const isDemoMode = !isSupabaseConfigured;

let client: SupabaseClient | null = null;

// Browser client using the read-only anon key (RLS allows SELECT only).
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      url ?? "https://placeholder.supabase.co",
      anonKey ?? "placeholder"
    );
  }
  return client;
}
