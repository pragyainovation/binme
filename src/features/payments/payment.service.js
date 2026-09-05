import "server-only";
import crypto from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";

function failure(message, status) { const error = new Error(message); error.status = status; return error; }
function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw failure("Razorpay is not configured.", 503);
  return { keyId, keySecret };
}

async function razorpayRequest(path, options = {}) {
  const { keyId, keySecret } = razorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw failure(body.error?.description || "Razorpay request failed.", 502);
  return body;
}

async function markPaymentCaptured(orderId, paymentDetails) {
  const { adminDb: db } = getAdminServices();
  const paymentRef = db.collection("payments").doc(orderId);
  const registrationRefFor = (payment) => db.collection(payment.resourceType === "course" ? "courseEnrollments" : "eventRegistrations").doc(`${payment.userId}_${payment.courseId || payment.eventId}`);

  await db.runTransaction(async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    if (!paymentSnap.exists) throw failure("Payment order not found.", 404);
    const payment = paymentSnap.data();
    const registrationRef = registrationRefFor(payment);
    const registrationSnap = await transaction.get(registrationRef);

    transaction.set(paymentRef, {
      paymentId: paymentDetails.id,
      method: paymentDetails.method || null,
      status: "captured",
      capturedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (!registrationSnap.exists) {
      if (payment.resourceType === "course") {
        const courseSnap = await transaction.get(db.collection("courses").doc(payment.courseId));
        const validityDays = Number(courseSnap.data()?.validityDays);
        if (!Number.isInteger(validityDays) || validityDays < 1) throw failure("This paid course has no valid access period.", 409);
        transaction.set(registrationRef, { userId: payment.userId, courseId: payment.courseId, accessType: "paid", status: "enrolled", paymentStatus: "captured", paymentId: paymentDetails.id, paymentOrderId: orderId, enrolledAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + validityDays * 24 * 60 * 60 * 1000), updatedAt: FieldValue.serverTimestamp() });
        transaction.update(db.collection("courses").doc(payment.courseId), { enrollmentCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      transaction.set(registrationRef, {
        userId: payment.userId,
        eventId: payment.eventId,
        status: "registered",
        paymentStatus: "captured",
        paymentId: paymentDetails.id,
        paymentOrderId: orderId,
        registeredAt: FieldValue.serverTimestamp(),
      });
      transaction.update(db.collection("events").doc(payment.eventId), {
        registrationCount: FieldValue.increment(1),
        registeredUsers: FieldValue.arrayUnion(payment.userId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function createRazorpayOrder(userId, sessionId) {
  const { adminDb: db } = getAdminServices();
  const sessionSnap = await db.collection("events").doc(sessionId).get();
  if (!sessionSnap.exists) throw failure("Session not found.", 404);
  const session = sessionSnap.data();
  if (session.accessType !== "paid" || Number(session.price) <= 0) throw failure("This session does not require payment.", 400);
  const { keyId } = razorpayConfig();
  const order = await razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(Number(session.price) * 100),
      currency: "INR",
      receipt: `event_${sessionId}_${Date.now()}`.slice(0, 40),
      notes: { eventId: sessionId, userId },
    }),
  });
  await db.collection("payments").doc(order.id).set({
    orderId: order.id,
    userId,
    eventId: sessionId,
    amount: order.amount,
    currency: order.currency,
    status: "created",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}

export async function createCourseRazorpayOrder(userId, courseId) {
  const { adminDb: db } = getAdminServices();
  const courseSnap = await db.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) throw failure("Course not found.", 404);
  const course = courseSnap.data();
  if (course.status !== "published" || course.accessType !== "paid" || Number(course.price) <= 0) throw failure("This course does not require payment.", 400);
  if (!Number.isInteger(Number(course.validityDays)) || Number(course.validityDays) < 1) throw failure("This paid course does not have a valid access period.", 409);
  const { keyId } = razorpayConfig();
  const order = await razorpayRequest("/orders", { method: "POST", body: JSON.stringify({ amount: Math.round(Number(course.price) * 100), currency: "INR", receipt: `course_${courseId}_${Date.now()}`.slice(0, 40), notes: { courseId, userId, resourceType: "course" } }) });
  await db.collection("payments").doc(order.id).set({ orderId: order.id, userId, courseId, resourceType: "course", amount: order.amount, currency: order.currency, status: "created", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}

export async function expireCourseEnrollment(userId, courseId) {
  const { adminDb: db } = getAdminServices();
  const ref = db.collection("courseEnrollments").doc(`${userId}_${courseId}`);
  const enrollment = await ref.get();
  if (!enrollment.exists || enrollment.data().userId !== userId) throw failure("Course enrollment not found.", 404);
  const data = enrollment.data();
  if (data.accessType !== "paid" || data.status !== "enrolled" || !data.expiresAt || data.expiresAt.toMillis() > Date.now()) return { expired: false };
  await ref.set({ status: "expired", expiredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { expired: true };
}

export async function verifyRazorpayPayment(userId, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }) {
  const { keySecret } = razorpayConfig();
  const { adminDb: db } = getAdminServices();
  const paymentRef = db.collection("payments").doc(orderId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists || paymentSnap.data().userId !== userId) throw failure("Payment order not found.", 404);
  const payment = paymentSnap.data();
  if (!paymentId || !signature) throw failure("Incomplete payment response.", 400);

  // Always use the order id saved by our server, never an id supplied by the browser.
  const expected = crypto.createHmac("sha256", keySecret).update(`${payment.orderId}|${paymentId}`).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw failure("Invalid payment signature.", 400);

  const razorpayPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (razorpayPayment.order_id !== payment.orderId || razorpayPayment.amount !== payment.amount) throw failure("Payment details do not match this session.", 400);
  if (razorpayPayment.status !== "captured") {
    await paymentRef.set({ paymentId, status: razorpayPayment.status || "authorized", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { success: false, pending: true, message: "Payment is being confirmed. Your registration will update shortly." };
  }
  await markPaymentCaptured(payment.orderId, razorpayPayment);
  return { success: true, status: "captured" };
}

export async function markPaymentRefunded(adminUserId, { orderId }) {
  if (!orderId) throw failure("Payment order is required.", 400);
  const { adminDb: db } = getAdminServices();
  const [adminSnap, paymentSnap] = await Promise.all([
    db.collection("users").doc(adminUserId).get(),
    db.collection("payments").doc(orderId).get(),
  ]);
  if (adminSnap.data()?.role !== "admin") throw failure("Admin access required.", 403);
  if (!paymentSnap.exists) throw failure("Payment not found.", 404);
  const payment = paymentSnap.data();
  if (payment.status === "refunded") throw failure("This payment is already marked as refunded.", 409);
  if (payment.status !== "captured") throw failure("Only captured payments can be marked as refunded.", 400);
  const eventSnap = await db.collection("events").doc(payment.eventId).get();
  if (!eventSnap.exists || eventSnap.data().status !== "cancelled") throw failure("Only payments for cancelled sessions can be marked as refunded.", 400);

  const refundRef = db.collection("payments").doc(orderId).collection("refunds").doc(`manual-${Date.now()}`);
  const batch = db.batch();
  batch.set(refundRef, {
    refundId: null,
    amount: payment.amount,
    currency: payment.currency || "INR",
    status: "processed",
    source: "razorpay_dashboard_manual",
    markedBy: adminUserId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(paymentSnap.ref, {
    status: "refunded",
    refundStatus: "processed",
    refundSource: "razorpay_dashboard_manual",
    refundedAt: FieldValue.serverTimestamp(),
    refundedBy: adminUserId,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return { success: true, status: "refunded" };
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) throw failure("Razorpay webhook is not configured.", 503);
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return Boolean(signature && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)));
}

export async function processRazorpayWebhook(payload) {
  const paymentDetails = payload?.payload?.payment?.entity;
  if (!paymentDetails?.order_id) return;
  const { adminDb: db } = getAdminServices();
  const paymentRef = db.collection("payments").doc(paymentDetails.order_id);
  const paymentSnap = await paymentRef.get();
  // Ignore notifications for payments that were not initiated by this application.
  if (!paymentSnap.exists) return;

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    await markPaymentCaptured(paymentDetails.order_id, paymentDetails);
    return;
  }
  if (payload.event === "payment.failed") {
    await paymentRef.set({ paymentId: paymentDetails.id || null, status: "failed", failureReason: paymentDetails.error_description || null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  const refund = payload?.payload?.refund?.entity;
  if (refund) {
    // A document per refund makes repeated webhook deliveries idempotent and auditable.
    await paymentRef.collection("refunds").doc(refund.id).set({
      refundId: refund.id,
      amount: refund.amount,
      currency: refund.currency || paymentSnap.data().currency,
      status: refund.status,
      speedProcessed: refund.speed_processed || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await paymentRef.set({
      refundStatus: refund.status,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}
