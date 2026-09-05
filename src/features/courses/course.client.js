import { browserAuth } from "@/lib/firebase/client-auth";

export async function deleteCourseWithLessons(courseId) {
  const user = browserAuth.currentUser;
  if (!user) throw new Error("You must be signed in as an admin.");
  const response = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to delete course.");
  return result;
}
