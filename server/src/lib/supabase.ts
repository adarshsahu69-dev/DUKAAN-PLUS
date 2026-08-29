import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!config.supabase.url) {
    throw new Error("SUPABASE_URL is not configured");
  }
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.secretKey || config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export type { SupabaseClient };
