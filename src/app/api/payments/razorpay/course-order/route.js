import { getAdminServices } from "@/lib/firebase/admin";
import { createCourseRazorpayOrder } from "@/features/payments/payment.service";
import { logPaymentError } from "@/features/payments/payment-log.service";
export const runtime="nodejs";
export async function POST(request) {
  let userId = null;
  let courseId = null;
  try {
    const value = request.headers.get("authorization") || "";
    const token = value.startsWith("Bearer ") ? value.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    userId = user.uid;
    const body = await request.json();
    courseId = body.courseId;
    return Response.json(await createCourseRazorpayOrder(userId, courseId, body.couponCode));
  } catch (error) {
    await logPaymentError({ userId, stage: "course_order_creation", resourceType: "course", resourceId: courseId, error });
    return Response.json({ error: error.message || "Unable to start course payment." }, { status: error.status || 500 });
  }
}
