self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || "Neue Nachricht", {
      body: data.body || "",
      icon: "/assets/HiasenHofLogo.png",
      badge: "/assets/HiasenHofLogo.png",
      data: { url: data.url || "/admin/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/";

  event.waitUntil(clients.openWindow(targetUrl));
});
