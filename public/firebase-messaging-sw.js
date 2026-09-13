// Kept as a no-op for browsers that still request the legacy Firebase Messaging service worker.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
