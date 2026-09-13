import { resetPassword } from "@/features/auth/password-reset.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await resetPassword(await request.json());
    return Response.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Password reset failed", error);
    return Response.json({ error: error.message || "Unable to reset password." }, { status: error.status || 500 });
  }
}
