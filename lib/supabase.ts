import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

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
