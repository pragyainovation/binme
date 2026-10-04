import { getAdminServices } from "@/lib/firebase/admin";
import { sendUpcomingCourseSessionReminderEmails } from "@/features/reminders/reminder.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await sendUpcomingCourseSessionReminderEmails(user.uid, await request.json()));
  } catch (error) {
    console.error("Course session reminder failed", error);
    return Response.json({ error: error.message || "Email reminder failed." }, { status: error.status || 500 });
  }
}
