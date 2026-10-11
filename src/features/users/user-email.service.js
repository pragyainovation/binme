import "server-only";
import { getAdminServices } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/mailer";

function failure(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function escapeHtml(value) {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[character]);
}

export async function sendEmailToActiveUsers(adminUserId, { subject, message }) {
  const normalizedSubject = String(subject || "").trim();
  const normalizedMessage = String(message || "").trim();
  if (!normalizedSubject || normalizedSubject.length > 150) throw failure("Subject is required and must be 150 characters or fewer.", 400);
  if (!normalizedMessage || normalizedMessage.length > 5000) throw failure("Message is required and must be 5,000 characters or fewer.", 400);

  const { adminAuth, adminDb: db } = getAdminServices();
  const adminProfile = await db.collection("users").doc(adminUserId).get();
  if (adminProfile.data()?.role !== "admin") throw failure("Admin access required.", 403);

  const [profileSnapshot, accountPages] = await Promise.all([
    db.collection("users").where("role", "==", "user").get(),
    (async () => {
      const accounts = [];
      let pageToken;
      do {
        const page = await adminAuth.listUsers(1000, pageToken);
        accounts.push(...page.users);
        pageToken = page.pageToken;
      } while (pageToken);
      return accounts;
    })(),
  ]);

  const accountsById = new Map(accountPages.map((account) => [account.uid, account]));
  const recipients = [...new Set(profileSnapshot.docs.flatMap((profile) => {
    const account = accountsById.get(profile.id);
    if (!account || account.disabled) return [];
    const email = String(account.email || profile.data().email || "").trim().toLowerCase();
    return email ? [email] : [];
  }))];

  const escapedMessage = escapeHtml(normalizedMessage).replace(/\r?\n/g, "<br>");
  let sent = 0;
  for (let index = 0; index < recipients.length; index += 10) {
    const batch = recipients.slice(index, index + 10);
    const results = await Promise.allSettled(batch.map((to) => sendEmail({
      to,
      subject: normalizedSubject,
      text: normalizedMessage,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:normal">${escapedMessage}</div>`,
      emailType: "active_users_broadcast",
    })));
    sent += results.filter((result) => result.status === "fulfilled").length;
  }

  return { recipients: recipients.length, sent, failed: recipients.length - sent };
}