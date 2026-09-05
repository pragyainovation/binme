import { getAdminServices } from "@/lib/firebase/admin";
import { markPaymentRefunded } from "@/features/payments/payment.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const admin = await adminAuth.verifyIdToken(token);
    return Response.json(await markPaymentRefunded(admin.uid, await request.json()));
  } catch (error) {
    console.error("Manual refund status update failed", error);
    return Response.json({ error: error.message || "Unable to update refund status." }, { status: error.status || 500 });
  }
}
