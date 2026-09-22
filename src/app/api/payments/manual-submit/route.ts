import { NextResponse } from "next/server";
import { manualPaymentSubmissionSchema } from "@/lib/validation/checkout";
import { submitManualPaymentVerification } from "@/lib/payments/payment-service";
import { handleApiError, jsonError } from "@/lib/api-response";
import { getCurrentSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "payments:manual-submit"), { max: 15, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many submissions. Please wait a moment.", 429);

    const data = manualPaymentSubmissionSchema.parse(await req.json());
    const session = await getCurrentSession();

    const payment = await prisma.payment.findUnique({ where: { id: data.paymentId }, include: { paymentMethod: true } });
    if (!payment) return jsonError("Payment not found", 404);
    if (!["COD", "ROCKET", "BANK_TRANSFER", "BKASH", "NAGAD"].includes(payment.paymentMethod.code)) {
      return jsonError("This payment method does not accept manual submissions", 422);
    }
    if (payment.status === "SUCCESS") return jsonError("This payment has already been verified", 409);

    const verification = await submitManualPaymentVerification({
      paymentId: payment.id,
      submittedByUserId: session?.user?.id,
      transactionId: data.transactionId,
      senderNumber: data.senderNumber,
      receiptUrl: data.receiptUrl,
      note: data.note,
    });

    return NextResponse.json({ verification }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
