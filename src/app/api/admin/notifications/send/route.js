import { getAdminServices } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function POST(request) {
  try {
    const token = getBearerToken(request);
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });

    const { adminAuth, adminDb: db, adminMessaging: messaging } = getAdminServices();
    const adminUser = await adminAuth.verifyIdToken(token);
    const adminProfile = await db.collection("users").doc(adminUser.uid).get();
    if (adminProfile.data()?.role !== "admin") {
      return Response.json({ error: "Admin access required." }, { status: 403 });
    }

    const { eventId, eventType } = await request.json();
    if (!eventId || !["session", "webinar", "event"].includes(eventType)) {
      return Response.json({ error: "A valid event is required." }, { status: 400 });
    }
    const collection = "events";
    const registrationCollection = "eventRegistrations";
    const eventSnap = await db.collection(collection).doc(eventId).get();
    if (!eventSnap.exists) return Response.json({ error: "Event not found." }, { status: 404 });

    const event = eventSnap.data();
    const registrationSnap = await db.collection(registrationCollection)
      .where("eventId", "==", eventId)
      .where("status", "==", "registered")
      .get();
    const usersSnap = await db.collection("users").get();
    const usersById = new Map(usersSnap.docs.map((item) => [item.id, { id: item.id, ...item.data() }]));
    const usersByEmail = new Map(usersSnap.docs
      .map((item) => [String(item.data().email || "").trim().toLowerCase(), { id: item.id, ...item.data() }])
      .filter(([email]) => email));
    const registeredUsers = registrationSnap.docs.map((item) => {
      const registration = item.data();
      return usersById.get(registration.userId)
        || usersByEmail.get(String(registration.emailNormalized || registration.email || "").trim().toLowerCase());
    }).filter(Boolean);
    const subcollectionTokens = (await Promise.all(registeredUsers.map(async (user) => {
      const tokenSnap = await db.collection("users").doc(user.id).collection("fcmTokens")
        .where("enabled", "==", true)
        .get();
      return tokenSnap.docs.map((item) => item.data().token).filter(Boolean);
    }))).flat();
    const legacyTokens = registeredUsers.flatMap((user) => user.pushTokens || []);
    const tokens = [...new Set([...subcollectionTokens, ...legacyTokens])];

    if (!tokens.length) return Response.json({ registered: registrationSnap.size, sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;
    for (const tokenBatch of chunks(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification: {
          title: event.title || "BinMe notification",
          body: "Your registered event is about to begin.",
        },
        data: { eventId, eventType },
      });
      sent += response.successCount;
      failed += response.failureCount;
    }

    return Response.json({ registered: registrationSnap.size, sent, failed });
  } catch (error) {
    console.error("Admin notification failed", error);
    return Response.json({ error: error.message || "Notification failed." }, { status: 500 });
  }
}
