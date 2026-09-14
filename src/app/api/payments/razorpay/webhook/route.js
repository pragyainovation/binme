import { processRazorpayWebhook, verifyRazorpayWebhookSignature } from "@/features/payments/payment.service";
import { logPaymentError } from "@/features/payments/payment-log.service";

export const runtime = "nodejs";

export async function POST(request) {
  let orderId = null;
  try {
    const rawBody = await request.text();
    if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
      return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    }
    const payload = JSON.parse(rawBody);
    orderId = payload?.payload?.payment?.entity?.order_id || null;
    await processRazorpayWebhook(payload);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook failed", error);
    await logPaymentError({ stage: "webhook_processing", orderId, error });
    return Response.json({ error: "Webhook processing failed." }, { status: error.status || 500 });
  }
}
