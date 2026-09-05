import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

export async function createUserProfile(user, extra = {}) {
  await setDoc(doc(browserDb, "users", user.uid), {
    uid: user.uid, email: user.email, name: extra.name || "", mobile: extra.mobile || "",
    role: extra.role || "user", createdAt: extra.createdAt || new Date().toISOString(),
  });
}

export async function getUserProfile(userId) {
  const snapshot = await getDoc(doc(browserDb, "users", userId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function savePushToken(userId, token) {
  await setDoc(doc(browserDb, "users", userId, "fcmTokens", token), {
    token, platform: "web", enabled: true, updatedAt: serverTimestamp(),
  }, { merge: true });
  await setPushNotificationsEnabled(userId, true);
}

export async function setPushNotificationsEnabled(userId, enabled) {
  await setDoc(doc(browserDb, "users", userId), { pushNotificationsEnabled: enabled, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAllUsers() {
  const snapshot = await getDocs(collection(browserDb, "users"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
