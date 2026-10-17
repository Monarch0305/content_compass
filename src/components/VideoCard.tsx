// A single saved-video card for the dashboard list.
//
// Tapping anywhere on the card opens the detail screen. The thumbnail, title,
// platform tag and summary are shown so you can recognise the video at a
// glance (project.md section 2 goal).

import Link from "next/link";
import type { SavedItem } from "@/lib/types";
import { PlatformTag } from "./PlatformTag";

export function VideoCard({ item }: { item: SavedItem }) {
  const watched = item.status === "watched";

  return (
    <Link
      href={`/video/${item.id}`}
      className="group flex gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2"
    >
      {/* Thumbnail with a fixed 16:9-ish box so the list stays tidy even while
          images load. */}
      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {/* Plain <img> is fine here; we switch to next/image once real,
            known image domains are configured. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail_url}
          alt=""
          className={`h-full w-full object-cover ${watched ? "opacity-40" : ""}`}
        />
        {item.duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">
            {item.duration}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <PlatformTag platform={item.platform} />
          {watched && <span className="text-[11px] text-muted">✓ Watched</span>}
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted">{item.summary}</p>
      </div>
    </Link>
  );
}
