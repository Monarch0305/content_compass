// YouTube detail-fetching (build step 3).
//
// Two sources, so the app works with or without an API key:
//   1. oEmbed — https://www.youtube.com/oembed — needs NO key. Gives the real
//      title, channel (author_name) and thumbnail. This is the baseline.
//   2. YouTube Data API — needs YOUTUBE_API_KEY. Only used to add the video's
//      duration, which oEmbed doesn't provide. Skipped if no key is set.
//
// Everything degrades gracefully: if a call fails, we fall back to a sensible
// placeholder rather than throwing, so saving a link never breaks.

import { extractYouTubeId } from "./platform";

export interface FetchedDetails {
  title: string;
  channel: string;
  duration: string | null;
  thumbnail_url: string;
}

// Turn an ISO-8601 duration ("PT10M34S") into a clock string ("10:34").
function iso8601ToClock(iso: string): string | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${ss}`;
  return `${min}:${ss}`;
}

export async function fetchYouTubeDetails(url: string): Promise<FetchedDetails> {
  const id = extractYouTubeId(url);
  const fallbackThumb = id
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : "";

  let title = "YouTube video";
  let channel = "";
  let thumbnail_url = fallbackThumb;

  // 1. oEmbed (keyless) — title, channel, thumbnail.
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      if (data.title) title = data.title;
      if (data.author_name) channel = data.author_name;
      if (data.thumbnail_url) thumbnail_url = data.thumbnail_url;
    }
  } catch {
    // keep the fallbacks
  }

  // 2. Duration via the Data API — only if a key is configured.
  let duration: string | null = null;
  const key = process.env.YOUTUBE_API_KEY;
  if (key && id) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${key}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          items?: { contentDetails?: { duration?: string } }[];
        };
        const iso = data.items?.[0]?.contentDetails?.duration;
        if (iso) duration = iso8601ToClock(iso);
      }
    } catch {
      // duration stays null
    }
  }

  return { title, channel, duration, thumbnail_url };
}
