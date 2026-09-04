import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth, adminDb: db } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json();
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return Response.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const paymentRef = db.collection("payments").doc(orderId);
    const paymentSnap = await paymentRef.get();
    const payment = paymentSnap.data();
    if (!paymentSnap.exists || payment.userId !== user.uid) return Response.json({ error: "Payment order not found." }, { status: 404 });
    const eventId = payment.eventId || payment.sessionId;
    const registrationRef = db.collection("eventRegistrations").doc(`${user.uid}_${eventId}`);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(registrationRef);
      if (payment.status !== "paid") {
        transaction.set(paymentRef, { paymentId, status: "paid", paidAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      if (!existing.exists) {
        transaction.set(registrationRef, { userId: user.uid, eventId, status: "registered", paymentId, paymentOrderId: orderId, registeredAt: FieldValue.serverTimestamp() });
        transaction.update(db.collection("events").doc(eventId), { registrationCount: FieldValue.increment(1), registeredUsers: FieldValue.arrayUnion(user.uid), updatedAt: FieldValue.serverTimestamp() });
      }
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Razorpay verification failed", error);
    return Response.json({ error: error.message || "Unable to verify payment." }, { status: 500 });
  }
}
