import { getAdminServices } from "@/lib/firebase/admin";
import { createRazorpayOrder } from "@/features/payments/payment.service";

export const runtime = "nodejs";
const tokenFrom = (request) => { const value = request.headers.get("authorization") || ""; return value.startsWith("Bearer ") ? value.slice(7) : null; };

export async function POST(request) {
  try {
    const token = tokenFrom(request);
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await createRazorpayOrder(user.uid, (await request.json()).sessionId));
  } catch (error) {
    console.error("Razorpay order failed", error);
    return Response.json({ error: error.message || "Unable to create payment order." }, { status: error.status || 500 });
  }
}
