// POST /api/cron/reminders — send the daily "videos waiting" nudge.
//
// Called by the scheduler (Supabase pg_cron) at the two daily times (D-018),
// protected by a shared secret so nothing else can trigger sends. It reads
// across all users (service role, bypassing RLS) and pushes one notification
// per device to every user who has at least one unwatched item.
//
// Activation needs three things in the environment (all optional until deploy):
//   SUPABASE_SERVICE_ROLE_KEY, the VAPID_* keys, and CRON_SECRET.
// Missing any -> 503 "not configured", so a misconfigured cron fails loudly.
//
// NOTE: this sends the two daily nudges. Firing the per-item custom-reminder
// presets (Tonight/This weekend/Next week) precisely needs a stored due-time;
// that's a small follow-up (a `remind_at` column) noted in project.md.

import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Auth: the scheduler must present the shared secret.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Config: VAPID keys + service-role client.
  const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 503 }
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, vapidPublic, VAPID_PRIVATE_KEY);

  // 3. Who has unwatched items? Newest first, so the first title per user is
  //    the most recent save.
  const { data: items, error: itemsError } = await admin
    .from("saved_items")
    .select("user_id, title")
    .eq("status", "unwatched")
    .order("created_at", { ascending: false });
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const byUser = new Map<string, { count: number; firstTitle: string }>();
  for (const it of items ?? []) {
    const entry = byUser.get(it.user_id);
    if (entry) entry.count += 1;
    else byUser.set(it.user_id, { count: 1, firstTitle: it.title });
  }
  if (byUser.size === 0) {
    return NextResponse.json({ sent: 0, note: "No unwatched items" });
  }

  // 4. Fetch subscriptions for exactly those users.
  const userIds = [...byUser.keys()];
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  // 5. Send one push per device.
  let sent = 0;
  let removed = 0;
  for (const sub of subs ?? []) {
    const info = byUser.get(sub.user_id);
    if (!info) continue;

    const payload = JSON.stringify({
      title:
        info.count === 1
          ? "1 video waiting"
          : `${info.count} videos waiting`,
      body: `Start with: ${info.firstTitle}`,
      url: "/",
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      sent += 1;
    } catch (err: unknown) {
      // 404/410 means the subscription is dead — remove it so we stop trying.
      const status =
        typeof err === "object" && err && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
      }
    }
  }

  return NextResponse.json({ sent, removed, users: byUser.size });
}
