import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const socialRef = doc(browserDb, "siteSettings", "social");

export async function getSocialLinks() {
  const snapshot = await getDoc(socialRef);
  return snapshot.exists() ? snapshot.data().links || {} : {};
}

export async function saveSocialLinks(links, userId) {
  const cleaned = Object.fromEntries(Object.entries(links).map(([platform, value]) => [platform, String(value || "").trim()]));
  for (const value of Object.values(cleaned)) {
    if (value && !/^https?:\/\//i.test(value)) throw new Error("Use a complete URL beginning with https:// for every social link.");
  }
  await setDoc(socialRef, { links: cleaned, updatedBy: userId, updatedAt: serverTimestamp() }, { merge: true });
}
