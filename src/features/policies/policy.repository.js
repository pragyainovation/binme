import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const validTypes = new Set(["terms", "privacy"]);

function policyRef(type) {
  if (!validTypes.has(type)) throw new Error("Invalid policy type.");
  return doc(browserDb, "sitePolicies", type);
}

export async function getSitePolicy(type) {
  const snapshot = await getDoc(policyRef(type));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveSitePolicy(type, content, userId) {
  if (!Array.isArray(content) || !content.some((node) => node.children?.some((child) => String(child.text || "").trim()))) throw new Error("Policy content cannot be empty.");
  await setDoc(policyRef(type), {
    type,
    content,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
