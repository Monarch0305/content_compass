"use client";

// Android share target. The manifest points the system share sheet here, so
// sharing a link from YouTube/Instagram opens /share?url=...&text=...&title=...
//
// We pull out the shared link (some apps put it in `url`, others only in the
// `text`) and hand it to the normal Add screen, prefilled, so the user can add
// a note or reminder before saving.

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function firstUrl(...candidates: (string | null)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const match = c.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
  }
  return null;
}

function ShareHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const shared = firstUrl(params.get("url"), params.get("text"));
    router.replace(shared ? `/add?url=${encodeURIComponent(shared)}` : "/add");
  }, [params, router]);

  return <p className="mt-10 text-center text-sm text-muted">Saving…</p>;
}

export default function SharePage() {
  return (
    <Suspense
      fallback={<p className="mt-10 text-center text-sm text-muted">Saving…</p>}
    >
      <ShareHandler />
    </Suspense>
  );
}
