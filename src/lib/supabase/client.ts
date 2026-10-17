// Supabase client for use in the browser (Client Components).
//
// It reads the public URL and publishable key from the environment. These are
// safe in the browser because Row Level Security decides what each logged-in
// user can actually touch.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
