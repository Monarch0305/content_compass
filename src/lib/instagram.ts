// Instagram Reel detail-fetching (build step 5).
//
// Per D-009 we only read the PUBLIC page preview (Open Graph tags) — no login,
// no bots, no scraping of private data. Meta has no simple open API for Reels,
// so this is best-effort: for many public reels the og: tags give us a title,
// a thumbnail and the caption; when they don't, we fall back to the user's
// note (which is exactly why the note exists, D-005).
//
// NOTE (D-010 follow-up): Instagram's og:image URLs expire, so a saved reel's
// thumbnail can go stale over time. Copying the image into our own storage is
// a planned follow-up; for now we store the og:image URL directly.

export interface InstagramDetails {
  title: string;
  thumbnail_url: string;
  caption: string | null;
}

function metaContent(html: string, property: string): string | null {
  // Match <meta property="og:xxx" content="..."> in either attribute order.
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1]);
  }
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchInstagramDetails(
  url: string
): Promise<InstagramDetails> {
  let title = "Saved Reel";
  let thumbnail_url = "";
  let caption: string | null = null;

  try {
    const res = await fetch(url.trim(), {
      headers: {
        // Instagram serves og: tags to crawler user-agents on public pages.
        "User-Agent": "facebookexternalhit/1.1",
        Accept: "text/html",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const ogTitle = metaContent(html, "og:title");
      const ogImage = metaContent(html, "og:image");
      const ogDesc = metaContent(html, "og:description");
      if (ogTitle) title = ogTitle;
      if (ogImage) thumbnail_url = ogImage;
      // og:description holds the caption for a reel; keep it for the summary.
      if (ogDesc) caption = ogDesc;
    }
  } catch {
    // keep fallbacks — the user's note will carry the context
  }

  return { title, thumbnail_url, caption };
}
