import "server-only";
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";

function failure(message, status) { const error = new Error(message); error.status = status; return error; }
function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw failure("Razorpay is not configured.", 503);
  return { keyId, keySecret };
}

export async function createRazorpayOrder(userId, sessionId) {
  const { adminDb: db } = getAdminServices();
  const sessionSnap = await db.collection("events").doc(sessionId).get();
  if (!sessionSnap.exists) throw failure("Session not found.", 404);
  const session = sessionSnap.data();
  if (session.accessType !== "paid" || Number(session.price) <= 0) throw failure("This session does not require payment.", 400);
  const { keyId, keySecret } = razorpayConfig();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(Number(session.price) * 100), currency: "INR", receipt: `${sessionId}-${userId}`.slice(0, 40) }),
  });
  const order = await response.json();
  if (!response.ok) throw failure(order.error?.description || "Unable to create payment order.", 502);
  await db.collection("payments").doc(order.id).set({ orderId: order.id, userId, eventId: sessionId, amount: order.amount, status: "created" });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}

export async function verifyRazorpayPayment(userId, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }) {
  const { keySecret } = razorpayConfig();
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw failure("Invalid payment signature.", 400);
  const { adminDb: db } = getAdminServices();
  const paymentRef = db.collection("payments").doc(orderId);
  const paymentSnap = await paymentRef.get();
  const payment = paymentSnap.data();
  if (!paymentSnap.exists || payment.userId !== userId) throw failure("Payment order not found.", 404);
  const eventId = payment.eventId || payment.sessionId;
  const registrationRef = db.collection("eventRegistrations").doc(`${userId}_${eventId}`);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(registrationRef);
    if (payment.status !== "paid") transaction.set(paymentRef, { paymentId, status: "paid", paidAt: FieldValue.serverTimestamp() }, { merge: true });
    if (!existing.exists) {
      transaction.set(registrationRef, { userId, eventId, status: "registered", paymentId, paymentOrderId: orderId, registeredAt: FieldValue.serverTimestamp() });
      transaction.update(db.collection("events").doc(eventId), { registrationCount: FieldValue.increment(1), registeredUsers: FieldValue.arrayUnion(userId), updatedAt: FieldValue.serverTimestamp() });
    }
  });
  return { success: true };
}
