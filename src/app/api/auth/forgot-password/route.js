import { requestPasswordReset } from "@/features/auth/password-reset.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email } = await request.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const sent = await requestPasswordReset(email, appUrl);
    if (!sent) return Response.json({ error: "No registered user was found with this email address." }, { status: 404 });
    return Response.json({ message: "A password-reset link has been sent to your registered email address." });
  } catch (error) {
    console.error("Password-reset request failed", error);
    return Response.json({ error: error.message || "Unable to send password-reset link." }, { status: error.status || 500 });
  }
}
