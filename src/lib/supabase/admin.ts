// Supabase ADMIN client — service role, bypasses Row Level Security.
//
// Used ONLY by the reminder cron endpoint, which must read across all users'
// items and push subscriptions to decide who to notify. Never import this into
// anything that runs in the browser or handles a normal user request — it has
// full database access.
//
// Returns null if the service-role key isn't configured yet, so the cron
// endpoint can respond with a clear "not configured" instead of crashing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
