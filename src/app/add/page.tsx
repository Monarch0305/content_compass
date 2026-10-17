"use client";

// ADD LINK screen.
//
// Paste (or share) a link, confirm a quick preview, optionally add a note and a
// reminder preset, then Save. On save the server fetches the real title,
// thumbnail and summary (step 3) and stores the item. When opened via the
// Android share sheet, the URL arrives as ?url=... and is prefilled + previewed.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { detectPlatform, extractYouTubeId, platformLabel } from "@/lib/platform";
import { REMINDER_PRESETS } from "@/lib/reminders";
import type { SavedItem, ReminderPreset } from "@/lib/types";
import { PlatformTag } from "@/components/PlatformTag";

function AddForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useStore();

  const sharedUrl = searchParams.get("url") ?? "";
  const [url, setUrl] = useState(sharedUrl);
  const [note, setNote] = useState("");
  // Part 2 of the note section: an optional quick-pick reminder (D-020).
  // null means "no custom reminder, just the usual daily nudges".
  const [reminder, setReminder] = useState<ReminderPreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A preview (platform + placeholder) shown to confirm before saving.
  const [preview, setPreview] = useState<SavedItem | null>(null);

  // Opened via the share sheet (?url=...): preview it automatically.
  useEffect(() => {
    if (sharedUrl) handlePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePreview() {
    setError(null);
    const platform = detectPlatform(url);

    if (!platform) {
      setError("That doesn't look like a YouTube, Shorts or Reels link.");
      return;
    }

    // Build a preview for confirmation. The real title/summary are filled in by
    // the server on save (placeholders until step 3). Duplicates are caught by
    // the database on save, which returns a readable error.
    const ytId = extractYouTubeId(url);
    const thumb = ytId
      ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
      : "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=640&q=70";

    setPreview({
      id: "preview",
      user_id: "",
      url: url.trim(),
      platform,
      title: `Saved ${platformLabel(platform)} link`,
      channel: "",
      duration: null,
      thumbnail_url: thumb,
      summary: "The real title and summary are fetched when you save.",
      user_note: null,
      custom_reminder: null,
      status: "unwatched",
      created_at: new Date().toISOString(),
      watched_at: null,
    });
  }

  async function handleSave() {
    if (!preview || saving) return;
    setError(null);
    setSaving(true);
    try {
      // Send just the URL + note + reminder; the server creates the real row.
      await addItem({
        url: preview.url,
        user_note: note.trim() || null,
        custom_reminder: reminder,
      });
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-medium">Add a link</h2>

      {/* Step 1: paste the URL. */}
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="text-sm text-muted">
          Paste a YouTube, Shorts or Reels link
        </label>
        <input
          id="url"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(null); // changing the URL invalidates the old preview
          }}
          className="rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}

        {!preview && (
          <button
            onClick={handlePreview}
            disabled={!url.trim()}
            className="mt-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Preview
          </button>
        )}
      </div>

      {/* Step 2: confirm the preview + optional note, then save. */}
      {preview && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3">
          <div className="flex gap-3">
            <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <PlatformTag platform={preview.platform} />
              <h3 className="line-clamp-2 text-sm font-medium">{preview.title}</h3>
              <p className="line-clamp-2 text-xs text-muted">{preview.summary}</p>
            </div>
          </div>

          {/* Part 1: why are you saving this? */}
          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-sm text-muted">
              Why are you saving this?{" "}
              <span className="text-xs">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              placeholder="e.g. for the weekend trip"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {/* Part 2: do you need a custom reminder? Quick presets; tapping the
              selected one again clears it (back to "just the daily nudges"). */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">
              Do you need a custom reminder?{" "}
              <span className="text-xs">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((preset) => {
                const selected = reminder === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setReminder(selected ? null : preset.key)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface-2 text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              You&apos;ll still get the usual daily nudges either way.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white active:scale-[0.99] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AddPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <AddForm />
    </Suspense>
  );
}
