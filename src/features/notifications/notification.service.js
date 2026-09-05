import "server-only";
import { getAdminServices } from "@/lib/firebase/admin";

function failure(message, status) { const error = new Error(message); error.status = status; return error; }
const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

export async function sendEventStartNotifications(adminUserId, { eventId, eventType }) {
  if (!eventId || !["session", "webinar", "event"].includes(eventType)) throw failure("A valid event is required.", 400);
  const { adminDb: db, adminMessaging: messaging } = getAdminServices();
  const profile = await db.collection("users").doc(adminUserId).get();
  if (profile.data()?.role !== "admin") throw failure("Admin access required.", 403);
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw failure("Event not found.", 404);
  const registrationSnap = await db.collection("eventRegistrations").where("eventId", "==", eventId).where("status", "==", "registered").get();
  const users = (await db.collection("users").get()).docs.map((item) => ({ id: item.id, ...item.data() }));
  const byId = new Map(users.map((user) => [user.id, user]));
  const byEmail = new Map(users.map((user) => [String(user.email || "").trim().toLowerCase(), user]).filter(([email]) => email));
  const registeredUsers = registrationSnap.docs.map((item) => { const registration = item.data(); return byId.get(registration.userId) || byEmail.get(String(registration.emailNormalized || registration.email || "").trim().toLowerCase()); }).filter((user) => user && user.pushNotificationsEnabled !== false);
  const tokenLists = await Promise.all(registeredUsers.map(async (user) => (await db.collection("users").doc(user.id).collection("fcmTokens").where("enabled", "==", true).get()).docs.map((item) => item.data().token).filter(Boolean)));
  const tokens = [...new Set([...tokenLists.flat(), ...registeredUsers.flatMap((user) => user.pushTokens || [])])];
  if (!tokens.length) return { registered: registrationSnap.size, sent: 0, failed: 0 };
  let sent = 0; let failed = 0;
  for (const tokenBatch of chunks(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({ tokens: tokenBatch, notification: { title: eventSnap.data().title || "BinMe notification", body: "Your registered event is about to begin." }, data: { eventId, eventType } });
    sent += response.successCount; failed += response.failureCount;
  }
  return { registered: registrationSnap.size, sent, failed };
}
