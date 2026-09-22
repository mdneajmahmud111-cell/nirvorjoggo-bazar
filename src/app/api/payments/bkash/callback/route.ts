import { NextResponse } from "next/server";
import { handlePaymentCallback } from "@/lib/payments/payment-service";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const payload = Object.fromEntries(searchParams.entries());

  try {
    const { payment, result } = await handlePaymentCallback("BKASH", payload);
    const ok = result ? result.success : payment.status === "SUCCESS";
    const dest = ok ? `/order/success/${payment.orderId}` : `/checkout?paymentError=${encodeURIComponent(result?.message ?? "bKash payment failed")}`;
    return NextResponse.redirect(new URL(dest, env.appUrl));
  } catch (err) {
    return NextResponse.redirect(new URL(`/checkout?paymentError=${encodeURIComponent((err as Error).message)}`, env.appUrl));
  }
}

export const POST = GET;
