// POST /api/push/subscribe — store a device's push subscription.
//
// Called by the "Enable reminders" button with the browser PushSubscription.
// We save it against the logged-in user (one row per endpoint) and make sure
// the user has a reminder_settings row with the default times (D-018).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const sub = await request.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Upsert the subscription (unique on user_id + endpoint).
  const { error: subError } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, keys: sub.keys },
      { onConflict: "user_id,endpoint" }
    );
  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // Ensure a reminder_settings row exists (defaults handle the times/timezone).
  await supabase
    .from("reminder_settings")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });

  return NextResponse.json({ ok: true });
}
