// Platform detection from a pasted/shared URL.
//
// This is a REAL utility (not fake data): it already works and we will keep
// using it unchanged when real saving is wired up in a later step. Detecting
// the platform decides which detail-fetcher runs (YouTube API vs Instagram
// preview) and which tag we show on the dashboard.

import type { Platform } from "./types";

// Figure out which platform a URL belongs to.
// Returns null if it is not a URL we support in V1.
export function detectPlatform(rawUrl: string): Platform | null {
  let host: string;
  try {
    // The URL constructor throws on anything that is not a valid URL,
    // which conveniently rejects junk input for us.
    host = new URL(rawUrl.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  const isYouTube = host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
  const isInstagram = host === "instagram.com" || host === "instagr.am";

  if (isYouTube) {
    // A "/shorts/" path means it is a YouTube Short; otherwise a normal video.
    return rawUrl.includes("/shorts/") ? "short" : "youtube";
  }
  if (isInstagram) {
    // We only handle Reels in V1 (not feed posts or stories).
    return rawUrl.includes("/reel/") || rawUrl.includes("/reels/") ? "reel" : null;
  }
  return null;
}

// Pull the 11-character YouTube video id out of any common YouTube URL shape.
// Needed later to build thumbnail URLs and call the YouTube API.
export function extractYouTubeId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.slice(1) || null; // youtu.be/<id>
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] || null; // youtube.com/shorts/<id>
    }
    return url.searchParams.get("v"); // youtube.com/watch?v=<id>
  } catch {
    return null;
  }
}

// Human-friendly label for the platform tag shown on cards.
export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "short":
      return "Short";
    case "reel":
      return "Reel";
  }
}
