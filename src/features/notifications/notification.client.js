import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { browserAuth } from "@/lib/firebase/client-auth";
import { firebaseApp } from "@/lib/firebase/client";
import { savePushToken } from "@/features/users/user.repository";

let foregroundListenerStarted = false;

export async function sendAdminNotification(eventId, eventType) {
  const user = browserAuth.currentUser;
  if (!user) throw new Error("You must be signed in as an admin.");
  const response = await fetch("/api/admin/notifications/send", {
    method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, eventType }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Notification failed.");
  return result;
}

export async function enablePushNotifications(user) {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
    throw new Error("This browser does not support push notifications.");
  }
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(firebaseApp);
  if (!foregroundListenerStarted) {
    onMessage(messaging, (payload) => registration.showNotification(payload.notification?.title || "BinMe notification", { body: payload.notification?.body || "You have a notification from BinMe.", data: payload.data || {} }));
    foregroundListenerStarted = true;
  }
  const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Push notifications could not be enabled.");
  await savePushToken(user.uid, token);
  return token;
}
