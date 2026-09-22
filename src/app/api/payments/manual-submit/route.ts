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

    const payment = await prisma.payment.findUnique({ where: { id: data.paymentId }, include: { paymentMethod: true, order: true } });
    if (!payment) return jsonError("Payment not found", 404);
    if (!["COD", "ROCKET", "BANK_TRANSFER", "BKASH", "NAGAD"].includes(payment.paymentMethod.code)) {
      return jsonError("This payment method does not accept manual submissions", 422);
    }
    if (payment.status === "SUCCESS") return jsonError("This payment has already been verified", 409);

    // Guest orders (no account) have no owner to check against — the payment ID itself, only
    // ever shown to the customer on their own order-success page, is the proof of possession.
    // An order placed by a logged-in account may only be submitted for by that same account (or
    // staff), never by a different signed-in user who happens to have the payment ID.
    const isStaff = Boolean(session?.user && ["ADMIN", "STAFF"].includes(session.user.role));
    if (payment.order.userId && session?.user?.id !== payment.order.userId && !isStaff) {
      return jsonError("Not authorized to submit payment details for this order", 403);
    }

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
