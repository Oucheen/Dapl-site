self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : "/admin";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((window) => window.url.startsWith(self.location.origin + "/phone"))
        || windows.find((window) => window.url.startsWith(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    }),
  );
});
