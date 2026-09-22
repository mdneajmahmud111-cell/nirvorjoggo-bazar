import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/payments/payment-service";

/**
 * SSLCommerz IPN (Instant Payment Notification) — a server-to-server call independent
 * of the customer's browser. We never trust this payload directly; handlePaymentWebhook
 * re-validates the transaction against SSLCommerz's own Validation API before marking
 * anything successful.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const payload = Object.fromEntries(params.entries());

  const result = await handlePaymentWebhook("SSLCOMMERZ", rawBody, payload, null);
  return NextResponse.json({ received: true, processed: result.processed });
}
