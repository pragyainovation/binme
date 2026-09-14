export async function reportPaymentError(user, details) {
  if (!user) return;
  try {
    await fetch("/api/payments/razorpay/client-error", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });
  } catch {
    // The original payment error remains visible even if the diagnostic request fails.
  }
}
