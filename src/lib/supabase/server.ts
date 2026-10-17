// Supabase client for use on the server (Route Handlers, Server Components).
//
// It reads and writes the auth session from cookies, so the logged-in user is
// known on the server and RLS applies automatically to every query.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          // In a Server Component, setting cookies throws; that's fine because
          // the middleware refreshes the session. We swallow the error.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore — handled by middleware
          }
        },
      },
    }
  );
}
