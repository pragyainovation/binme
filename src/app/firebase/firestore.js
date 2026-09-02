import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { IST_TIMEZONE } from "./time";

export async function createUserProfile(user, extraData = {}) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    name: extraData.name || "",
    mobile: extraData.mobile || "",
    role: extraData.role || "user",
    createdAt: extraData.createdAt || new Date().toISOString(),
  });
}

export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}

export async function getSessions() {
  const snap = await getDocs(collection(db, "sessions"));
  return snap.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((session) => session.status !== "cancelled")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export async function getFreeWebinar() {
  const snap = await getDocs(collection(db, "freeWebinars"));
  const webinars = snap.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .filter((webinar) => webinar.status !== "inactive")
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

  return webinars[0] || null;
}

export async function getFreeWebinarById(webinarId) {
  const snap = await getDoc(doc(db, "freeWebinars", webinarId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getFreeWebinarsWithRegistrations() {
  const webinarSnap = await getDocs(collection(db, "freeWebinars"));
  const registrationSnap = await getDocs(collection(db, "freeWebinarRegistrations"));
  const registrations = registrationSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));

  return webinarSnap.docs.map((docItem) => {
    const webinarRegistrations = registrations.filter((registration) => registration.webinarId === docItem.id);
    return {
      id: docItem.id,
      ...docItem.data(),
      registrations: webinarRegistrations,
      registrationCount: webinarRegistrations.length,
    };
  });
}

export async function createFreeWebinar(webinarData) {
  const ref = await addDoc(collection(db, "freeWebinars"), {
    ...webinarData,
    status: "active",
    timezone: IST_TIMEZONE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFreeWebinar(webinarId, webinarData) {
  await updateDoc(doc(db, "freeWebinars", webinarId), {
    ...webinarData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFreeWebinar(webinarId) {
  await deleteDoc(doc(db, "freeWebinars", webinarId));
}

export async function registerForFreeWebinar(webinarId, registrationData) {
  const existingQuery = query(
    collection(db, "freeWebinarRegistrations"),
    where("webinarId", "==", webinarId),
    where("emailNormalized", "==", registrationData.email.trim().toLowerCase())
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) return { alreadyRegistered: true };

  const ref = await addDoc(collection(db, "freeWebinarRegistrations"), {
    webinarId,
    name: registrationData.name.trim(),
    email: registrationData.email.trim(),
    emailNormalized: registrationData.email.trim().toLowerCase(),
    mobile: registrationData.mobile.trim(),
    userId: null,
    status: "registered",
    registeredAt: serverTimestamp(),
  });

  return { alreadyRegistered: false, id: ref.id };
}

export async function claimFreeWebinarRegistrations(user) {
  if (!user?.email) return [];

  const registrationQuery = query(
    collection(db, "freeWebinarRegistrations"),
    where("emailNormalized", "==", user.email.trim().toLowerCase())
  );
  const snap = await getDocs(registrationQuery);
  await Promise.all(snap.docs
    .filter((docItem) => docItem.data().userId !== user.uid)
    .map((docItem) => updateDoc(doc(db, "freeWebinarRegistrations", docItem.id), { userId: user.uid })));

  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data(), userId: user.uid }));
}

export async function getFreeWebinarRegistrationsByUser(user) {
  if (!user?.email) return [];

  const registrationQuery = query(
    collection(db, "freeWebinarRegistrations"),
    where("emailNormalized", "==", user.email.trim().toLowerCase())
  );
  const snap = await getDocs(registrationQuery);
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}

export async function getSessionById(sessionId) {
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createSession(sessionData) {
  const payload = {
    ...sessionData,
    status: "active",
    timezone: IST_TIMEZONE,
    registrationCount: 0,
    registeredUsers: [],
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "sessions"), payload);
  return ref.id;
}

export async function updateSession(sessionId, sessionData) {
  const ref = doc(db, "sessions", sessionId);
  await updateDoc(ref, sessionData);
}

export async function cancelSession(sessionId) {
  const ref = doc(db, "sessions", sessionId);
  await updateDoc(ref, { status: "cancelled" });
}

export async function deleteSession(sessionId) {
  await deleteDoc(doc(db, "sessions", sessionId));
}

export async function isUserRegistered(userId, sessionId) {
  const q = query(
    collection(db, "registrations"),
    where("userId", "==", userId),
    where("sessionId", "==", sessionId)
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

export async function registerForSession(userId, sessionId) {
  const alreadyRegistered = await isUserRegistered(userId, sessionId);
  if (alreadyRegistered) {
    return { alreadyRegistered: true };
  }

  const sessionRef = doc(db, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) {
    throw new Error("Session not found.");
  }

  const ref = await addDoc(collection(db, "registrations"), {
    userId,
    sessionId,
    status: "registered",
    registeredAt: serverTimestamp(),
  });

  await updateDoc(sessionRef, {
    registrationCount: increment(1),
    registeredUsers: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });

  return { alreadyRegistered: false, id: ref.id };
}

export async function getRegistrationsByUser(userId) {
  const q = query(collection(db, "registrations"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}

export async function getRegistrationsBySession(sessionId) {
  const q = query(collection(db, "registrations"), where("sessionId", "==", sessionId));
  const snap = await getDocs(q);
  return snap.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .sort((a, b) => {
      const aTime = a.registeredAt?.seconds ?? 0;
      const bTime = b.registeredAt?.seconds ?? 0;
      return aTime - bTime;
    });
}

export async function getSessionsWithRegistrationData() {
  const sessions = await getSessions();
  const allRegistrations = await getDocs(collection(db, "registrations"));
  const registrationsBySession = {};

  allRegistrations.docs.forEach((docItem) => {
    const reg = { id: docItem.id, ...docItem.data() };
    const { sessionId } = reg;
    if (!sessionId) return;

    if (!registrationsBySession[sessionId]) {
      registrationsBySession[sessionId] = [];
    }

    registrationsBySession[sessionId].push(reg);
  });

  return sessions.map((session) => {
    const registrations = registrationsBySession[session.id] || [];
    const registeredUsers = Array.isArray(session.registeredUsers) && session.registeredUsers.length > 0
      ? session.registeredUsers
      : registrations.map((reg) => reg.userId);

    return {
      ...session,
      registrationCount: Number(session.registrationCount ?? registeredUsers.length),
      registeredUsers,
      registrations,
    };
  });
}
