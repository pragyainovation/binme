import "server-only";
import nodemailer from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";

function configurationError() {
  const error = new Error("Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.");
  error.status = 500;
  return error;
}

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw configurationError();
  return { from: user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

async function logEmailDelivery({ to, subject, emailType, status, messageId = null, error = null }) {
  try {
    const { adminDb } = getAdminServices();
    await adminDb.collection("emailLogs").add({
      recipient: Array.isArray(to) ? to.join(", ") : String(to || ""),
      subject: String(subject || ""),
      emailType,
      status,
      messageId,
      error: error ? String(error).slice(0, 1000) : null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    // A logging issue must never prevent the primary email operation.
    console.error("Email delivery log failed", logError);
  }
}

export async function sendEmail({ to, subject, text, html, emailType = "general" }) {
  try {
    const { from, transporter } = getTransport();
    const result = await transporter.sendMail({ from, to, subject, text, html });
    const rejected = result.rejected?.length ? result.rejected.join(", ") : null;
    if (rejected) {
      await logEmailDelivery({ to, subject, emailType, status: "failed", messageId: result.messageId || null, error: `Rejected recipient: ${rejected}` });
      throw new Error(`Email could not be delivered to: ${rejected}`);
    }
    await logEmailDelivery({ to, subject, emailType, status: "sent", messageId: result.messageId || null });
    return result;
  } catch (error) {
    if (!error.message?.startsWith("Email could not be delivered to:")) {
      await logEmailDelivery({ to, subject, emailType, status: "failed", error: error.message || "Unknown email delivery error" });
    }
    throw error;
  }
}
