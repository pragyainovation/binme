import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";
import { IST_TIMEZONE } from "@/lib/time/ist";

const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export async function getSessions() {
  const sessions = records(await getDocs(collection(browserDb, "events")));
  return sessions.filter((item) => item.status !== "cancelled").sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
export async function getLandingEvents() {
  const events = records(await getDocs(collection(browserDb, "events")));
  return events
    .filter((event) => event.status === "active" && event.showOnLanding === true)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}
export async function getSessionById(sessionId) {
  const snapshot = await getDoc(doc(browserDb, "events", sessionId));
  if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() };
  const bySlug = await getDocs(query(collection(browserDb, "events"), where("slug", "==", sessionId), limit(1)));
  return bySlug.empty ? null : { id: bySlug.docs[0].id, ...bySlug.docs[0].data() };
}
export async function createSession(data) {
  const ref = await addDoc(collection(browserDb, "events"), { ...data, slug: data.slug || crypto.randomUUID(), status: "active", timezone: IST_TIMEZONE, registrationCount: 0, registeredUsers: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateSession(sessionId, data) { await updateDoc(doc(browserDb, "events", sessionId), { ...data, updatedAt: serverTimestamp() }); }
export async function cancelSession(sessionId) { await updateDoc(doc(browserDb, "events", sessionId), { status: "cancelled", updatedAt: serverTimestamp() }); }
export async function deleteSession(sessionId) { await deleteDoc(doc(browserDb, "events", sessionId)); }

export async function getFreeWebinar() {
  const webinars = records(await getDocs(collection(browserDb, "freeWebinars")));
  return webinars.filter((item) => item.status !== "inactive").sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))[0] || null;
}
export async function getFreeWebinarById(webinarId) {
  const snapshot = await getDoc(doc(browserDb, "freeWebinars", webinarId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
export async function createFreeWebinar(data) {
  const ref = await addDoc(collection(browserDb, "freeWebinars"), { ...data, status: "active", timezone: IST_TIMEZONE, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function updateFreeWebinar(webinarId, data) { await updateDoc(doc(browserDb, "freeWebinars", webinarId), { ...data, updatedAt: serverTimestamp() }); }
export async function deleteFreeWebinar(webinarId) { await deleteDoc(doc(browserDb, "freeWebinars", webinarId)); }
