import { getAdminServices } from "@/lib/firebase/admin";
import { createRazorpayOrder } from "@/features/payments/payment.service";
import { logPaymentError } from "@/features/payments/payment-log.service";

export const runtime = "nodejs";
const tokenFrom = (request) => { const value = request.headers.get("authorization") || ""; return value.startsWith("Bearer ") ? value.slice(7) : null; };

export async function POST(request) {
  let userId = null;
  let sessionId = null;
  try {
    const token = tokenFrom(request);
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    userId = user.uid;
    const body = await request.json();
    sessionId = body.sessionId;
    const { couponCode } = body;
    return Response.json(await createRazorpayOrder(user.uid, sessionId, couponCode));
  } catch (error) {
    console.error("Razorpay order failed", error);
    await logPaymentError({ userId, stage: "event_order_creation", resourceType: "event", resourceId: sessionId, error });
    return Response.json({ error: error.message || "Unable to create payment order." }, { status: error.status || 500 });
  }
}
