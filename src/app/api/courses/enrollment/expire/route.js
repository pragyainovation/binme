import { getAdminServices } from "@/lib/firebase/admin";
import { expireCourseEnrollment } from "@/features/payments/payment.service";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await expireCourseEnrollment(user.uid, (await request.json()).courseId));
  } catch (error) { return Response.json({ error: error.message || "Unable to update course access." }, { status: error.status || 500 }); }
}
