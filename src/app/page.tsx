"use client";

// HOME / DASHBOARD screen.
//
// Lists the user's saved items: everything still to watch at the top, with
// already-watched items tucked into a collapsed section below. A floating
// "+" button goes to the Add screen.

import Link from "next/link";
import { useStore } from "@/lib/store";
import { VideoCard } from "@/components/VideoCard";
import { SignOutButton } from "@/components/SignOutButton";
import { EnableReminders } from "@/components/EnableReminders";

export default function DashboardPage() {
  const { items, loading } = useStore();

  const unwatched = items.filter((it) => it.status === "unwatched");
  const watched = items.filter((it) => it.status === "watched");

  if (loading) {
    return <p className="mt-10 text-center text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Count on the left (the backlog, which is the whole point) + sign out. */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {unwatched.length === 0
            ? "Nothing waiting. Nice and clear."
            : `${unwatched.length} ${unwatched.length === 1 ? "video" : "videos"} waiting to watch`}
        </p>
        <div className="flex items-center gap-3">
          <EnableReminders />
          <SignOutButton />
        </div>
      </div>

      {unwatched.length === 0 && watched.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            {unwatched.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))}
          </section>

          {watched.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted">
                Watched ({watched.length})
              </summary>
              <section className="mt-3 flex flex-col gap-3">
                {watched.map((item) => (
                  <VideoCard key={item.id} item={item} />
                ))}
              </section>
            </details>
          )}
        </>
      )}

      {/* Floating add button, thumb-reachable at the bottom of the phone. */}
      <Link
        href="/add"
        aria-label="Add a link"
        className="fixed bottom-6 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-2xl font-light text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
      >
        +
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <div className="text-4xl">🧭</div>
      <h2 className="text-base font-medium">No saved videos yet</h2>
      <p className="max-w-xs text-sm text-muted">
        Paste a YouTube, Shorts or Reels link to save it here and get reminded
        to actually watch it.
      </p>
      <Link
        href="/add"
        className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white"
      >
        Add your first link
      </Link>
    </div>
  );
}
