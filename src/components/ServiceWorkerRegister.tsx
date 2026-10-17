"use client";

// Registers the service worker once, on the client. Rendered in the root
// layout so it runs on every page. Does nothing where service workers aren't
// supported (e.g. some in-app browsers).

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on http (non-localhost) or private modes;
      // the app still works, just without push.
    });
  }, []);

  return null;
}
