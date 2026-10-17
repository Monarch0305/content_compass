"use client";

// Signs the user out and returns them to the login screen.

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="text-xs text-muted underline-offset-2 hover:underline"
    >
      Sign out
    </button>
  );
}
