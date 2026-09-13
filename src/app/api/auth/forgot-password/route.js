import { requestPasswordReset } from "@/features/auth/password-reset.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email } = await request.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    await requestPasswordReset(email, appUrl);
    return Response.json({ message: "If the email is registered, a password-reset link has been sent." });
  } catch (error) {
    console.error("Password-reset request failed", error);
    return Response.json({ error: error.message || "Unable to send password-reset link." }, { status: error.status || 500 });
  }
}
