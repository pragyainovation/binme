import { browserAuth } from "@/lib/firebase/client-auth";

export async function markPaymentRefunded(orderId) {
  const user = browserAuth.currentUser;
  if (!user) throw new Error("You must be signed in as an admin.");
  const response = await fetch("/api/admin/payments/refund", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to update refund status.");
  return result;
}
