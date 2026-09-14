import { getAdminServices } from "@/lib/firebase/admin";
import { logPaymentError } from "@/features/payments/payment-log.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const value = request.headers.get("authorization") || "";
    const token = value.startsWith("Bearer ") ? value.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    const { resourceType, resourceId, orderId, stage, message } = await request.json();
    await logPaymentError({
      userId: user.uid,
      stage: stage === "checkout" ? "checkout" : "client_payment_error",
      resourceType: resourceType === "course" ? "course" : "event",
      resourceId: typeof resourceId === "string" ? resourceId : null,
      orderId: typeof orderId === "string" ? orderId : null,
      error: message,
    });
    return Response.json({ logged: true });
  } catch (error) {
    console.error("Client payment error log failed", error);
    return Response.json({ error: "Unable to save payment error." }, { status: 500 });
  }
}
