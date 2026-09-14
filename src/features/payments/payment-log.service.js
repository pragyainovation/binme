import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";

// Store only diagnostic metadata. Never persist card, UPI, token, signature, or secret values.
export async function logPaymentError({ userId = null, stage, resourceType = null, resourceId = null, orderId = null, error }) {
  try {
    const { adminDb } = getAdminServices();
    await adminDb.collection("paymentLogs").add({
      level: "error",
      stage,
      userId,
      resourceType,
      resourceId,
      orderId,
      message: String(error?.message || error || "Unknown payment error").slice(0, 1000),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    // Logging must never hide the original payment error from the user.
    console.error("Unable to save payment error log", logError);
  }
}
