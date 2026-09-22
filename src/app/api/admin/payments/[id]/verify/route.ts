import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSchema } from "@/lib/validation/admin";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { approvePaymentVerification, rejectPaymentVerification } from "@/lib/payments/payment-service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN", "STAFF");
    const data = verifyPaymentSchema.parse(await req.json());

    const payment = await prisma.payment.findUnique({ where: { id: params.id }, include: { verifications: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!payment) return jsonError("Payment not found", 404);

    const latestVerification = payment.verifications[0];
    if (!latestVerification) return jsonError("No pending verification submission for this payment", 422);
    if (latestVerification.status !== "PENDING_REVIEW") return jsonError("This submission has already been reviewed", 409);

    const result =
      data.action === "APPROVE"
        ? await approvePaymentVerification(latestVerification.id, session.user.id)
        : await rejectPaymentVerification(latestVerification.id, session.user.id, data.rejectionReason!);

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
