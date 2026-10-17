"use client";

// VIDEO DETAIL screen.
//
// Shows the full summary, your note, and the actions: open the video, mark it
// watched (so reminders skip it), or delete it. All three read/write the same
// in-memory store, so changes show up immediately on the dashboard.

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { reminderLabel } from "@/lib/reminders";
import { PlatformTag } from "@/components/PlatformTag";

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { getItem, markWatched, deleteItem, loading } = useStore();

  const item = getItem(params.id);

  // While the list is still loading (e.g. opened directly / after refresh),
  // don't flash the "not found" message.
  if (loading && !item) {
    return <p className="mt-10 text-center text-sm text-muted">Loading…</p>;
  }

  // The item may be missing (deleted, or a stale link). Gentle fallback.
  if (!item) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted">That item isn&apos;t here anymore.</p>
        <Link href="/" className="text-sm text-accent">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const watched = item.status === "watched";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-sm text-muted">
        ← Back
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="aspect-video w-full bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <PlatformTag platform={item.platform} />
            {item.duration && (
              <span className="text-xs text-muted">{item.duration}</span>
            )}
            {watched && <span className="text-xs text-muted">✓ Watched</span>}
          </div>

          <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
          <p className="text-sm text-muted">{item.channel}</p>

          <div>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Summary
            </h3>
            <p className="text-sm leading-relaxed">{item.summary}</p>
          </div>

          {item.user_note && (
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Your note
              </h3>
              <p className="text-sm leading-relaxed">{item.user_note}</p>
            </div>
          )}

          {item.custom_reminder && (
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Custom reminder
              </h3>
              <p className="text-sm leading-relaxed">
                {reminderLabel(item.custom_reminder)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {/* Opens the original video in a new tab (the real app on a phone opens
            the YouTube/Instagram app). */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-medium text-white active:scale-[0.99]"
        >
          Open video
        </a>

        {!watched && (
          <button
            onClick={async () => {
              await markWatched(item.id);
              router.push("/");
              router.refresh();
            }}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium active:scale-[0.99]"
          >
            Mark as watched
          </button>
        )}

        <button
          onClick={async () => {
            await deleteItem(item.id);
            router.push("/");
            router.refresh();
          }}
          className="rounded-xl px-4 py-3 text-sm font-medium text-red-600 active:scale-[0.99]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
