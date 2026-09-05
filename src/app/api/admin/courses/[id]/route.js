import { getAdminServices } from "@/lib/firebase/admin";
import { deleteCourseWithLessons } from "@/features/courses/course.service";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const admin = await adminAuth.verifyIdToken(token);
    const { id } = await params;
    return Response.json(await deleteCourseWithLessons(admin.uid, id));
  } catch (error) {
    return Response.json({ error: error.message || "Unable to delete course." }, { status: error.status || 500 });
  }
}
