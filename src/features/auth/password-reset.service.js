import { createHash, randomBytes } from "crypto";
import { getAdminServices } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { createPasswordResetEmail } from "@/lib/email/templates/password-reset.template";

const RESET_VALIDITY_MS = 12 * 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(email, appUrl) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your registered email address.");

  const { adminAuth, adminDb } = getAdminServices();
  let user;
  try {
    user = await adminAuth.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.code === "auth/user-not-found") return;
    throw error;
  }

  const profile = await adminDb.collection("users").doc(user.uid).get();
  if (profile.exists && profile.data().role === "admin") return;

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const resetRef = adminDb.collection("passwordResets").doc(user.uid);
  await adminDb.runTransaction(async (transaction) => {
    const current = await transaction.get(resetRef);
    const lastRequestedAt = current.exists ? current.data().lastRequestedAt?.toMillis?.() : null;
    if (lastRequestedAt && now - lastRequestedAt < REQUEST_COOLDOWN_MS) {
      const error = new Error("A password-reset link was already requested. Please try again after 24 hours.");
      error.status = 429;
      throw error;
    }
    transaction.set(resetRef, {
      tokenHash: tokenHash(token),
      lastRequestedAt: new Date(now),
      expiresAt: new Date(now + RESET_VALIDITY_MS),
      usedAt: null,
    });
  });

  const resetUrl = `${appUrl.replace(/\/$/, "")}/reset-password?uid=${encodeURIComponent(user.uid)}&token=${token}`;
  await sendEmail({ to: user.email, ...createPasswordResetEmail(resetUrl), emailType: "password_reset" });
}

export async function resetPassword({ uid, token, password }) {
  if (!uid || !token) throw new Error("This password-reset link is invalid.");
  if (typeof password !== "string" || password.length < 8) throw new Error("Use at least 8 characters for your new password.");

  const { adminAuth, adminDb } = getAdminServices();
  const resetRef = adminDb.collection("passwordResets").doc(uid);
  await adminDb.runTransaction(async (transaction) => {
    const record = await transaction.get(resetRef);
    const data = record.data();
    const expiresAt = data?.expiresAt?.toMillis?.() || 0;
    if (!record.exists || data.usedAt || expiresAt < Date.now() || data.tokenHash !== tokenHash(token)) {
      const error = new Error("This password-reset link is invalid or has expired.");
      error.status = 400;
      throw error;
    }
    transaction.update(resetRef, { usedAt: new Date() });
  });
  await adminAuth.updateUser(uid, { password });
}
