import { processRazorpayWebhook, verifyRazorpayWebhookSignature } from "@/features/payments/payment.service";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
      return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    }
    await processRazorpayWebhook(JSON.parse(rawBody));
    return Response.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook failed", error);
    return Response.json({ error: "Webhook processing failed." }, { status: error.status || 500 });
  }
}
