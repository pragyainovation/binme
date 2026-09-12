import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export async function getCoupons() {
  return records(await getDocs(query(collection(browserDb, "coupons"), orderBy("createdAt", "desc"), limit(50))));
}

export async function createCoupon(data) {
  return (await addDoc(collection(browserDb, "coupons"), { ...data, code: data.code.trim().toUpperCase(), usedCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;
}

export async function updateCoupon(couponId, data) {
  await updateDoc(doc(browserDb, "coupons", couponId), { ...data, code: data.code.trim().toUpperCase(), updatedAt: serverTimestamp() });
}

export async function deleteCoupon(couponId) { await deleteDoc(doc(browserDb, "coupons", couponId)); }
