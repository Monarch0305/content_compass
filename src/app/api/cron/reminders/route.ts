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
// Two passes, chosen by the request body's `type`:
//   "daily"  (default) -> the two daily "N videos waiting" nudges (D-018)
//   "custom"           -> per-item preset reminders that are now due (D-029),
//                         scheduled every 15 min; each fires once (reminded flag)

import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
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

  // Which pass to run? Default to the daily nudge for backward compatibility.
  const body = await request.json().catch(() => ({}));
  if (body?.type === "custom") {
    return sendCustomReminders(admin);
  }

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

// Custom-reminder pass (D-029): send a push for each unwatched item whose
// remind_at is due and hasn't been reminded yet, then mark it reminded so it
// fires only once. Runs every 15 minutes (see supabase/reminders_cron.sql).
type Sub = { id: string; user_id: string; endpoint: string; keys: unknown };

async function sendCustomReminders(admin: SupabaseClient) {
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("saved_items")
    .select("id, user_id, title")
    .eq("status", "unwatched")
    .eq("reminded", false)
    .not("remind_at", "is", null)
    .lte("remind_at", nowIso);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ reminders: 0, note: "Nothing due" });
  }

  const userIds = [...new Set(due.map((d) => d.user_id))];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  const subsByUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  let sent = 0;
  let removed = 0;
  let reminders = 0;
  for (const item of due) {
    const userSubs = subsByUser.get(item.user_id);
    if (!userSubs || userSubs.length === 0) continue; // no device yet — retry later

    const payload = JSON.stringify({
      title: "⏰ Time to watch",
      body: item.title,
      url: "/",
    });

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as webpush.PushSubscription["keys"] },
          payload
        );
        sent += 1;
      } catch (err: unknown) {
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

    // Mark reminded once we've attempted delivery, so it won't fire again.
    await admin.from("saved_items").update({ reminded: true }).eq("id", item.id);
    reminders += 1;
  }

  return NextResponse.json({ sent, removed, reminders });
}
