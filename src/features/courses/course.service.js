import "server-only";
import { getAdminServices } from "@/lib/firebase/admin";

function failure(message, status) { const error = new Error(message); error.status = status; return error; }

export async function deleteCourseWithLessons(adminUserId, courseId) {
  if (!courseId) throw failure("Course ID is required.", 400);
  const { adminDb: db } = getAdminServices();
  const [adminSnap, courseSnap] = await Promise.all([
    db.collection("users").doc(adminUserId).get(),
    db.collection("courses").doc(courseId).get(),
  ]);
  if (adminSnap.data()?.role !== "admin") throw failure("Admin access required.", 403);
  if (!courseSnap.exists) throw failure("Course not found.", 404);
  const enrollments = await db.collection("courseEnrollments").where("courseId", "==", courseId).get();
  const writer = db.bulkWriter();
  enrollments.docs.forEach((enrollment) => writer.delete(enrollment.ref));
  await writer.close();
  await db.recursiveDelete(courseSnap.ref);
  return { success: true };
}
