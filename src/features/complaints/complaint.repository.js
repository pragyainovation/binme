import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const ordered = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
export async function getComplaintById(id) { const item = await getDoc(doc(browserDb, "complaints", id)); return item.exists() ? { id: item.id, ...item.data() } : null; }
export async function getComplaintsByUser(userId) { return ordered(await getDocs(query(collection(browserDb, "complaints"), where("userId", "==", userId)))); }
export async function getAllComplaints() { return ordered(await getDocs(collection(browserDb, "complaints"))); }
export async function createComplaint(user, subject, description) {
  const text = description.trim(); const name = user.displayName || user.email || "User";
  return (await addDoc(collection(browserDb, "complaints"), { userId: user.uid, userName: name, userEmail: user.email || "", subject: subject.trim(), description: text, status: "open", messages: [{ authorId: user.uid, authorName: name, authorRole: "user", text, createdAt: new Date().toISOString() }], createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;
}
export async function addComplaintMessage(id, user, text, role) { await updateDoc(doc(browserDb, "complaints", id), { messages: arrayUnion({ authorId: user.uid, authorName: user.displayName || user.email || (role === "admin" ? "Admin" : "User"), authorRole: role, text: text.trim(), createdAt: new Date().toISOString() }), status: role === "admin" ? "in-progress" : "open", updatedAt: serverTimestamp() }); }
export async function closeComplaint(id) { await updateDoc(doc(browserDb, "complaints", id), { status: "closed", closedAt: serverTimestamp(), updatedAt: serverTimestamp() }); }
