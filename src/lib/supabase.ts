import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}
