import { collection, getDocs, query, where } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

// The Firestore rule permits this query only for the currently authenticated owner.
export async function getPaymentsByUser(userId) {
  const snapshot = await getDocs(query(collection(browserDb, "payments"), where("userId", "==", userId)));
  return records(snapshot).sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.capturedAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || b.capturedAt?.seconds || 0;
    return bTime - aTime;
  });
}

export async function getAllPayments() {
  const snapshot = await getDocs(collection(browserDb, "payments"));
  return records(snapshot).sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.capturedAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || b.capturedAt?.seconds || 0;
    return bTime - aTime;
  });
}
