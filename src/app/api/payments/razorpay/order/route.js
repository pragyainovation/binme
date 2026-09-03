import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  return initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail,
    privateKey,
  }) });
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

export async function POST(request) {
  try {
    const token = bearer(request);
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const app = getAdminApp();
    const user = await getAuth(app).verifyIdToken(token);
    const { sessionId } = await request.json();
    const db = getFirestore(app);
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) return Response.json({ error: "Session not found." }, { status: 404 });
    const session = sessionSnap.data();
    if (session.accessType !== "paid" || Number(session.price) <= 0) {
      return Response.json({ error: "This session does not require payment." }, { status: 400 });
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return Response.json({ error: "Razorpay is not configured." }, { status: 503 });
    }

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: Math.round(Number(session.price) * 100), currency: "INR", receipt: `${sessionId}-${user.uid}`.slice(0, 40) }),
    });
    const order = await razorpayResponse.json();
    if (!razorpayResponse.ok) return Response.json({ error: order.error?.description || "Unable to create payment order." }, { status: 502 });

    await db.collection("payments").doc(order.id).set({ orderId: order.id, userId: user.uid, sessionId, amount: order.amount, status: "created" });
    return Response.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error("Razorpay order failed", error);
    return Response.json({ error: error.message || "Unable to create payment order." }, { status: 500 });
  }
}