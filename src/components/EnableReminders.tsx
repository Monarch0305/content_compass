"use client";

// A small control on the dashboard to turn on push reminders.
//
// Flow: ask the browser for notification permission -> subscribe through the
// service worker using our VAPID public key -> send the subscription to the
// server to store. Shows the current state so the button doesn't lie.

import { useEffect, useState } from "react";

// Web Push needs the VAPID public key as a Uint8Array, not a base64 string.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  // Allocate an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which pushManager.subscribe's applicationServerKey (BufferSource) accepts.
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "default" | "granted" | "denied" | "busy";

export function EnableReminders() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as State);
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission as State);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) throw new Error("Push is not configured (missing VAPID key).");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error("Could not save the subscription.");

      setState("granted");
    } catch {
      // Re-read the real permission state so the UI stays honest.
      setState((Notification.permission as State) ?? "default");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "granted") {
    return <p className="text-xs text-muted">🔔 Reminders on</p>;
  }
  if (state === "denied") {
    return (
      <p className="text-xs text-muted">
        Reminders blocked — enable notifications in your browser settings.
      </p>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "busy"}
      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-accent disabled:opacity-40"
    >
      {state === "busy" ? "Enabling…" : "Enable reminders"}
    </button>
  );
}
