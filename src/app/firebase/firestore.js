import {
  addDoc,
  arrayUnion,
  collection,
  doc,
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

export async function getSessionById(sessionId) {
  const sessionRef = doc(db, "sessions", sessionId);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createSession(sessionData) {
  const payload = {
    ...sessionData,
    status: "active",
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
