import { getAdminServices } from "@/lib/firebase/admin";
import { verifyRazorpayPayment } from "@/features/payments/payment.service";
import { logPaymentError } from "@/features/payments/payment-log.service";

export const runtime = "nodejs";

export async function POST(request) {
  let userId = null;
  let orderId = null;
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    userId = user.uid;
    const payment = await request.json();
    orderId = payment.razorpay_order_id || null;
    return Response.json(await verifyRazorpayPayment(userId, payment));
  } catch (error) {
    console.error("Razorpay verification failed", error);
    await logPaymentError({ userId, stage: "payment_verification", orderId, error });
    return Response.json({ error: error.message || "Unable to verify payment." }, { status: error.status || 500 });
  }
}
