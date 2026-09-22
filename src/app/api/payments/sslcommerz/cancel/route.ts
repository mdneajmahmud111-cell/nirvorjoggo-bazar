import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const form = await req.formData();
  const tranId = String(form.get("tran_id") ?? "");

  if (tranId) {
    await prisma.payment.updateMany({ where: { merchantTransactionId: tranId }, data: { status: "CANCELLED" } }).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(`/checkout?paymentError=${encodeURIComponent("Payment was cancelled")}`, env.appUrl), 303);
}
