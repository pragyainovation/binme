import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/mailer";

const formatAmount = (amount) => `INR ${(Number(amount || 0) / 100).toFixed(2)}`;
const escapeHtml = (value) => String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function receiptEmail({ userName, itemName, payment }) {
  const amount = formatAmount(payment.amount);
  const paidAt = payment.capturedAt?.toDate?.() || new Date();
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(paidAt);
  const method = payment.method === "cash" ? "Cash" : "Online payment";
  const receiptId = payment.orderId || payment.id;
  const text = `Hi ${userName},\n\nWe received your payment of ${amount} for ${itemName}.\n\nPayment method: ${method}\nPayment date: ${date}\nReceipt ID: ${receiptId}\nStatus: Paid\n\nThank you for learning with BinMe.`;
  const html = `<main style="max-width:600px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#17211f"><div style="background:#16211f;padding:22px 24px;border-radius:14px 14px 0 0;color:#fff"><strong style="font-size:24px">BinMe</strong><p style="margin:7px 0 0;font-size:12px;letter-spacing:1px">PAYMENT RECEIPT</p></div><section style="border:1px solid #e3e6e3;border-top:0;border-radius:0 0 14px 14px;padding:26px"><h1 style="margin:0 0 12px;font-size:23px">Payment received</h1><p style="margin:0 0 24px;color:#53615f">Hi ${escapeHtml(userName)}, we have received your payment successfully.</p><div style="background:#e5f6e9;border-radius:10px;padding:18px;margin-bottom:22px"><span style="display:block;color:#53615f;font-size:12px;font-weight:bold">AMOUNT PAID</span><strong style="display:block;margin-top:5px;color:#116638;font-size:24px">${amount}</strong></div><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:10px 0;color:#53615f">Course / session</td><td style="padding:10px 0;text-align:right;font-weight:bold">${escapeHtml(itemName)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e8ece9;color:#53615f">Payment method</td><td style="padding:10px 0;border-top:1px solid #e8ece9;text-align:right;font-weight:bold">${method}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e8ece9;color:#53615f">Payment date</td><td style="padding:10px 0;border-top:1px solid #e8ece9;text-align:right;font-weight:bold">${date}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e8ece9;color:#53615f">Receipt ID</td><td style="padding:10px 0;border-top:1px solid #e8ece9;text-align:right;font-weight:bold;word-break:break-all">${escapeHtml(receiptId)}</td></tr></table><p style="margin:24px 0 0;color:#53615f;font-size:13px">Thank you for learning with BinMe.</p></section></main>`;
  return { subject: `Payment receipt - ${itemName}`, text, html };
}

export async function sendPaymentReceiptEmail(paymentId) {
  const { adminDb: db } = getAdminServices();
  const paymentRef = db.collection("payments").doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists || paymentSnap.data().status !== "captured") return { sent: false };
  const payment = { id: paymentSnap.id, ...paymentSnap.data() };
  if (payment.receiptEmailStatus === "sent" || payment.receiptEmailStatus === "sending") return { sent: false };
  const userSnap = await db.collection("users").doc(payment.userId).get();
  const recipient = String(userSnap.data()?.email || "").trim().toLowerCase();
  if (!recipient) return { sent: false };
  const itemSnap = payment.courseId ? await db.collection("courses").doc(payment.courseId).get() : await db.collection("events").doc(payment.eventId).get();
  const itemName = itemSnap.data()?.title || (payment.courseId ? "Course" : "Session");
  const userName = userSnap.data()?.name || "Learner";
  const claimed = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(paymentRef);
    if (!current.exists || current.data().receiptEmailStatus === "sent" || current.data().receiptEmailStatus === "sending") return false;
    transaction.update(paymentRef, { receiptEmailStatus: "sending", receiptEmailUpdatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) return { sent: false };
  try {
    const result = await sendEmail({ to: recipient, ...receiptEmail({ userName, itemName, payment }), emailType: "payment_receipt" });
    await paymentRef.update({ receiptEmailStatus: "sent", receiptEmailSentAt: FieldValue.serverTimestamp(), receiptEmailMessageId: result.messageId || null, receiptEmailUpdatedAt: FieldValue.serverTimestamp() });
    return { sent: true };
  } catch (error) {
    await paymentRef.update({ receiptEmailStatus: "failed", receiptEmailError: String(error.message || "Unable to send receipt.").slice(0, 500), receiptEmailUpdatedAt: FieldValue.serverTimestamp() });
    throw error;
  }
}
