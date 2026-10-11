import { getAdminServices } from "@/lib/firebase/admin";
import { sendEmailToActiveUsers } from "@/features/users/user-email.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { adminAuth } = getAdminServices();
    const user = await adminAuth.verifyIdToken(token);
    return Response.json(await sendEmailToActiveUsers(user.uid, await request.json()));
  } catch (error) {
    console.error("Active user email failed", error);
    return Response.json({ error: error.message || "Unable to send email." }, { status: error.status || 500 });
  }
}