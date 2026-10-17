// PWA manifest, served by Next.js at /manifest.webmanifest.
//
// This makes the app installable on Android and declares the share target so
// a link shared from YouTube/Instagram opens Content Compass at /share.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const base: MetadataRoute.Manifest = {
    name: "Content Compass",
    short_name: "Compass",
    description: "Save later. Actually watch instead of forgetting.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  // share_target isn't in Next's Manifest type yet, so attach it and cast.
  return {
    ...base,
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
