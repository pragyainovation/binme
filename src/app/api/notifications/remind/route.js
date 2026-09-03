import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { parseISTDate } from "../../../firebase/time";

export const runtime = "nodejs";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

function isDue(item, now) {
  const start = parseISTDate(item.date, item.time);
  if (!start) return false;
  const minutesUntilStart = (start.getTime() - now) / 60000;
  return minutesUntilStart >= 28 && minutesUntilStart <= 32;
}

async function sendReminder(db, messaging, registration, event, now) {
  const userSnap = await db.collection("users").doc(registration.userId).get();
  const tokens = userSnap.data()?.pushTokens || [];
  const reminderKey = `${event.id}:${event.date}:${event.time}`;
  if (registration.reminderKey === reminderKey) return { sent: false, reason: "already-sent" };

  const notification = {
    userId: registration.userId,
    registrationId: registration.id,
    registrationCollection: registration.collection,
    eventId: event.id,
    eventType: event.type,
    title: `${event.title} starts in 30 minutes`,
    body: "Your registered BinMe session is about to begin.",
    attemptedAt: new Date(now),
  };

  if (!tokens.length) {
    if (process.env.IsNotificationStore === "true") {
      await db.collection("notifications").add({ ...notification, status: "failed", error: "No push tokens found for this user." });
    }
    return { sent: false, reason: "no-token" };
  }

  let response;
  try {
    response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: { eventId: event.id, eventType: event.type },
    });
  } catch (sendError) {
    if (process.env.IsNotificationStore === "true") {
      await db.collection("notifications").add({
        ...notification,
        status: "failed",
        error: sendError.message || "Firebase Messaging send failed.",
      });
    }
    return { sent: false, reason: "send-failed" };
  }

  const status = response.successCount === tokens.length
    ? "sent"
    : response.successCount > 0 ? "partial_failure" : "failed";
  const errors = response.responses
    .filter((result) => !result.success)
    .map((result) => result.error?.message)
    .filter(Boolean);

  if (process.env.IsNotificationStore === "true") {
    await db.collection("notifications").add({
      ...notification,
      status,
      sentAt: new Date(now),
      deliveryCount: response.successCount,
      failureCount: response.failureCount,
      errors,
    });
  }

  await db.collection(registration.collection).doc(registration.id).update({
    reminderKey,
    reminderSentAt: new Date(now),
  });
  return { sent: response.successCount > 0, reason: status };
}

export async function GET(request) {
  if (request.headers.get("x-cron-secret") !== process.env.NOTIFICATION_CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const app = getAdminApp();
    const db = getFirestore(app);
    const messaging = getMessaging(app);
    const now = Date.now();
    const [sessionSnap, webinarSnap, registrationSnap, freeRegistrationSnap] = await Promise.all([
      db.collection("sessions").where("status", "!=", "cancelled").get(),
      db.collection("freeWebinars").where("status", "==", "active").get(),
      db.collection("registrations").where("status", "==", "registered").get(),
      db.collection("freeWebinarRegistrations").where("status", "==", "registered").get(),
    ]);

    const sessions = new Map(sessionSnap.docs.map((item) => [item.id, { id: item.id, type: "session", ...item.data() }]));
    const webinars = new Map(webinarSnap.docs.map((item) => [item.id, { id: item.id, type: "webinar", ...item.data() }]));
    const dueSessions = registrationSnap.docs
      .map((item) => ({ id: item.id, collection: "registrations", ...item.data() }))
      .map((registration) => ({ registration, event: sessions.get(registration.sessionId) }))
      .filter(({ registration, event }) => event && registration.userId && isDue(event, now));
    const dueWebinars = freeRegistrationSnap.docs
      .map((item) => ({ id: item.id, collection: "freeWebinarRegistrations", ...item.data() }))
      .map((registration) => ({ registration, event: webinars.get(registration.webinarId) }))
      .filter(({ registration, event }) => event && registration.userId && isDue(event, now));

    const results = await Promise.all([...dueSessions, ...dueWebinars].map(({ registration, event }) => sendReminder(db, messaging, registration, event, now)));
    return Response.json({ checked: results.length, sent: results.filter((result) => result.sent).length });
  } catch (error) {
    console.error("Notification reminder failed", error);
    return Response.json({ error: error.message || "Reminder failed" }, { status: 500 });
  }
}
