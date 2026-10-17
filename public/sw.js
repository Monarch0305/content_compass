// Content Compass service worker.
//
// Two jobs for V1:
//   1. Receive push messages and show a notification (even when the app is
//      closed — this is what makes reminders work).
//   2. When the notification is tapped, focus the app (or open it).
//
// Kept deliberately minimal: no offline caching yet (not needed for V1).

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Content Compass";
  const options = {
    body: data.body || "You have videos waiting to watch.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open, else open a new one.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
