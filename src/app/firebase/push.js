import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { savePushToken } from "./firestore";

export async function enablePushNotifications(user) {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support push notifications.");
  }

  const supported = await isSupported();
  if (!supported) {
    throw new Error("This browser does not support push notifications.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(getMessaging(), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Push notifications could not be enabled. Check the Firebase messaging configuration.");
  }

  await savePushToken(user.uid, token);
  return token;
}
