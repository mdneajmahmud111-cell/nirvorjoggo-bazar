import { NextResponse } from "next/server";
import { handlePaymentCallback } from "@/lib/payments/payment-service";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const form = await req.formData();
  const payload = Object.fromEntries(form.entries()) as Record<string, string>;

  try {
    const { payment, result } = await handlePaymentCallback("SSLCOMMERZ", payload);
    const ok = result ? result.success : payment.status === "SUCCESS";
    const dest = ok ? `/order/success/${payment.orderId}` : `/checkout?paymentError=${encodeURIComponent(result?.message ?? "SSLCommerz payment could not be validated")}`;
    return NextResponse.redirect(new URL(dest, env.appUrl), 303);
  } catch (err) {
    return NextResponse.redirect(new URL(`/checkout?paymentError=${encodeURIComponent((err as Error).message)}`, env.appUrl), 303);
  }
}
