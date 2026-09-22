import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api-response";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { paymentMethod: true, bankAccount: true },
    });
    if (!payment) return jsonError("Payment not found", 404);

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: payment.status,
        verificationStatus: payment.verificationStatus,
        amount: payment.amount,
        method: payment.paymentMethod.displayName,
        rejectionReason: payment.rejectionReason,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
