import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { savePushToken } from "./firestore";
import { auth } from "./config";

let foregroundListenerStarted = false;

export async function sendAdminNotification(eventId, eventType) {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in as an admin.");

  const token = await user.getIdToken();
  const response = await fetch("/api/admin/notifications/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ eventId, eventType }),
  });
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || "Notification failed.");
  return result;
}

export async function enablePushNotifications(user) {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support push notifications.");
  }

  const supported = await isSupported();
  if (!supported) {
    throw new Error("This browser does not support push notifications.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const messaging = getMessaging();
  if (!foregroundListenerStarted) {
    onMessage(messaging, (payload) => {
      const notification = payload.notification || {};
      registration.showNotification(notification.title || "BinMe notification", {
        body: notification.body || "You have a notification from BinMe.",
        icon: "/icon-192.png",
        data: payload.data || {},
      });
    });
    foregroundListenerStarted = true;
  }

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Push notifications could not be enabled. Check the Firebase messaging configuration.");
  }

  await savePushToken(user.uid, token);
  return token;
}
