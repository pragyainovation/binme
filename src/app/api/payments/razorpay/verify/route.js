import { getAdminServices } from "@/lib/firebase/admin";
import { verifyRazorpayPayment } from "@/features/payments/payment.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await verifyRazorpayPayment(user.uid, await request.json()));
  } catch (error) {
    console.error("Razorpay verification failed", error);
    return Response.json({ error: error.message || "Unable to verify payment." }, { status: error.status || 500 });
  }
}
