// /api/links — list and create saved items for the logged-in user.
//
// GET  -> the current user's items, newest first
// POST -> create one item from a URL { url, user_note, custom_reminder }
//
// Every query runs through the Supabase server client, which carries the
// user's session, so Row Level Security guarantees a user only touches their
// own rows. We also check the session explicitly to return a clean 401.
//
// NOTE (step 2): real YouTube/Instagram detail-fetching and the AI summary
// come in step 3. For now POST stores sensible placeholders, like the Add
// screen's preview did.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectPlatform } from "@/lib/platform";
import { fetchYouTubeDetails } from "@/lib/youtube";
import { fetchInstagramDetails } from "@/lib/instagram";
import { summarise } from "@/lib/summary";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url: string | undefined = body?.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { error: "That doesn't look like a YouTube, Shorts or Reels link." },
      { status: 400 }
    );
  }

  // Fetch real details for YouTube/Shorts. Reels have no open API (D-009), so
  // they use placeholders and the summary leans on the user's note.
  const note: string | null = body?.user_note ?? null;
  let title: string;
  let channel = "";
  let duration: string | null = null;
  let thumbnail_url: string;
  let caption: string | null = null;

  if (platform === "youtube" || platform === "short") {
    const details = await fetchYouTubeDetails(url);
    title = details.title;
    channel = details.channel;
    duration = details.duration;
    thumbnail_url = details.thumbnail_url;
  } else {
    // Instagram Reel: public preview (Open Graph) tags only (D-009).
    const details = await fetchInstagramDetails(url);
    title = details.title;
    thumbnail_url = details.thumbnail_url;
    caption = details.caption;
  }

  // AI summary (Claude Haiku when a key is set, else a note/caption/title fallback).
  const summary = await summarise({ platform, title, channel, note, caption });

  const { data, error } = await supabase
    .from("saved_items")
    .insert({
      user_id: user.id,
      url,
      platform,
      title,
      channel,
      duration,
      thumbnail_url,
      summary,
      user_note: note,
      custom_reminder: body?.custom_reminder ?? null,
    })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation -> the (user_id, url) pair already exists.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already saved this one." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
