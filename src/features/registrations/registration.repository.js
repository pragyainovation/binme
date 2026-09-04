import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
export async function isUserRegistered(userId, sessionId) { return (await getDoc(doc(browserDb, "eventRegistrations", `${userId}_${sessionId}`))).exists(); }
export async function registerForSession(userId, sessionId) {
  const registrationRef = doc(browserDb, "eventRegistrations", `${userId}_${sessionId}`);
  const sessionRef = doc(browserDb, "events", sessionId);
  const [existing, session] = await Promise.all([getDoc(registrationRef), getDoc(sessionRef)]);
  if (existing.exists()) return { alreadyRegistered: true };
  if (!session.exists()) throw new Error("Event not found.");
  if (session.data().accessType === "paid") throw new Error("Complete payment before registering for this event.");
  await setDoc(registrationRef, { userId, eventId: sessionId, status: "registered", registeredAt: serverTimestamp() });
  return { alreadyRegistered: false, id: registrationRef.id };
}
export async function registerForEventGuest(eventId, data) {
  const emailNormalized = data.email.trim().toLowerCase();
  const existing = await getDocs(query(collection(browserDb, "eventRegistrations"), where("eventId", "==", eventId), where("emailNormalized", "==", emailNormalized)));
  if (!existing.empty) return { alreadyRegistered: true };
  const ref = await addDoc(collection(browserDb, "eventRegistrations"), {
    eventId, userId: null, name: data.name.trim(), email: data.email.trim(), emailNormalized,
    mobile: data.mobile.trim(), status: "registered", registeredAt: serverTimestamp(),
  });
  await updateDoc(doc(browserDb, "events", eventId), {
    registrationCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  return { alreadyRegistered: false, id: ref.id };
}
export async function claimEventRegistrations(user) {
  if (!user?.email) return [];
  const snapshot = await getDocs(query(collection(browserDb, "eventRegistrations"), where("emailNormalized", "==", user.email.trim().toLowerCase())));
  await Promise.all(snapshot.docs.filter((item) => item.data().userId !== user.uid).map((item) => updateDoc(item.ref, { userId: user.uid }))); 
  return records(snapshot).map((item) => ({ ...item, userId: user.uid }));
}
export async function getRegistrationsByUser(userId) { return records(await getDocs(query(collection(browserDb, "eventRegistrations"), where("userId", "==", userId)))).map((item) => ({ ...item, sessionId: item.eventId })); }
export async function getRegistrationsBySession(sessionId) {
  return records(await getDocs(query(collection(browserDb, "eventRegistrations"), where("eventId", "==", sessionId)))).sort((a, b) => (a.registeredAt?.seconds || 0) - (b.registeredAt?.seconds || 0));
}
export async function getSessionsWithRegistrationData() {
  const [{ getSessions }, snapshot] = await Promise.all([import("@/features/events/event.repository"), getDocs(collection(browserDb, "eventRegistrations"))]);
  const sessions = await getSessions();
  const bySession = new Map();
  for (const registration of records(snapshot)) {
    if (registration.eventId) bySession.set(registration.eventId, [...(bySession.get(registration.eventId) || []), registration]);
  }
  return sessions.map((session) => {
    const registrations = bySession.get(session.id) || [];
    const registeredUsers = registrations.map((item) => item.userId).filter(Boolean);
    // Registrations are the source of truth; the event aggregate is only an optimization.
    return { ...session, registrations, registeredUsers, registrationCount: registrations.length };
  });
}
export async function registerForFreeWebinar(webinarId, data) {
  const emailNormalized = data.email.trim().toLowerCase();
  const existing = await getDocs(query(collection(browserDb, "freeWebinarRegistrations"), where("webinarId", "==", webinarId), where("emailNormalized", "==", emailNormalized)));
  if (!existing.empty) return { alreadyRegistered: true };
  const ref = await addDoc(collection(browserDb, "freeWebinarRegistrations"), { webinarId, name: data.name.trim(), email: data.email.trim(), emailNormalized, mobile: data.mobile.trim(), userId: data.userId || null, status: "registered", registeredAt: serverTimestamp() });
  return { alreadyRegistered: false, id: ref.id };
}
export async function claimFreeWebinarRegistrations(user) {
  if (!user?.email) return [];
  const snapshot = await getDocs(query(collection(browserDb, "freeWebinarRegistrations"), where("emailNormalized", "==", user.email.trim().toLowerCase())));
  await Promise.all(snapshot.docs.filter((item) => item.data().userId !== user.uid).map((item) => updateDoc(item.ref, { userId: user.uid })));
  return records(snapshot).map((item) => ({ ...item, userId: user.uid }));
}
export async function getFreeWebinarsWithRegistrations() {
  const [webinars, registrations] = await Promise.all([getDocs(collection(browserDb, "freeWebinars")), getDocs(collection(browserDb, "freeWebinarRegistrations"))]);
  const all = records(registrations);
  return records(webinars).map((webinar) => { const items = all.filter((item) => item.webinarId === webinar.id); return { ...webinar, registrations: items, registrationCount: items.length }; });
}
