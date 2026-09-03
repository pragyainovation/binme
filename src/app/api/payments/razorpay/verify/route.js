import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  return initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail, privateKey }) });
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const app = getAdminApp();
    const user = await getAuth(app).verifyIdToken(token);
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json();
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return Response.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const db = getFirestore(app);
    const paymentRef = db.collection("payments").doc(orderId);
    const paymentSnap = await paymentRef.get();
    const payment = paymentSnap.data();
    if (!paymentSnap.exists || payment.userId !== user.uid) return Response.json({ error: "Payment order not found." }, { status: 404 });
    const registrationRef = db.collection("registrations").doc(`${user.uid}_${payment.sessionId}`);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(registrationRef);
      if (payment.status !== "paid") {
        transaction.set(paymentRef, { paymentId, status: "paid", paidAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      if (!existing.exists) {
        transaction.set(registrationRef, { userId: user.uid, sessionId: payment.sessionId, status: "registered", paymentId, paymentOrderId: orderId, registeredAt: FieldValue.serverTimestamp() });
        transaction.update(db.collection("sessions").doc(payment.sessionId), { registrationCount: FieldValue.increment(1), registeredUsers: FieldValue.arrayUnion(user.uid), updatedAt: FieldValue.serverTimestamp() });
      }
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Razorpay verification failed", error);
    return Response.json({ error: error.message || "Unable to verify payment." }, { status: 500 });
  }
}