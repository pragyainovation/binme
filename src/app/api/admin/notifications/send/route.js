import { getAdminServices } from "@/lib/firebase/admin";
import { sendEventStartNotifications } from "@/features/notifications/notification.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await sendEventStartNotifications(user.uid, await request.json()));
  } catch (error) {
    console.error("Admin notification failed", error);
    return Response.json({ error: error.message || "Notification failed." }, { status: error.status || 500 });
  }
}
