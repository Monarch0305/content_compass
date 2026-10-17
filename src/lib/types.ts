// Shared data shapes for Content Compass.
//
// These mirror the `saved_items` table planned in project.md section 7.
// Keeping them in one place means the screens, the fake data, and (later)
// the real database code all agree on the same shape.

// The platforms we support in V1 (decision D-003).
export type Platform = "youtube" | "short" | "reel";

// Whether the user has watched an item yet. Reminders only nag about
// "unwatched" items.
export type ItemStatus = "unwatched" | "watched";

// Optional per-item reminder, chosen as a quick preset at save time (D-020).
// This is on top of the two daily nudges. We store the preset key now and turn
// it into a real date/time when reminders are actually built (step 4).
export type ReminderPreset = "tonight" | "weekend" | "next_week";

// One saved video. Every field here will map to a column in Supabase later.
// `user_id` is intentionally present from day one (decision D-011), even
// though V1 has a single user, so we never have to rebuild for multi-user.
export interface SavedItem {
  id: string;
  user_id: string;
  url: string;
  platform: Platform;

  // Details fetched from YouTube / Instagram (faked for now).
  title: string;
  channel: string;
  duration: string | null; // e.g. "0:45"; null when unknown (common for Reels)
  thumbnail_url: string;

  // The AI summary and the user's own optional note (decision D-005).
  summary: string;
  user_note: string | null;

  // Optional custom reminder preset, or null for "just the daily nudges" (D-020).
  custom_reminder: ReminderPreset | null;

  status: ItemStatus;
  created_at: string; // ISO timestamp
  watched_at: string | null;
}
