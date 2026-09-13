import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
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

export async function getAllUsers() {
  const snapshot = await getDocs(query(collection(browserDb, "users"), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getRegisteredUsers() {
  const snapshot = await getDocs(collection(browserDb, "users"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((user) => user.role === "user")
    .sort((first, second) => String(second.createdAt || "").localeCompare(String(first.createdAt || "")));
}
