import { NextResponse } from "next/server";
import { refundRequestSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { refundPayment } from "@/lib/payments/payment-service";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN");
    const data = refundRequestSchema.parse(await req.json());

    const refund = await refundPayment(params.id, data.amount, data.reason, session.user.id);
    return NextResponse.json({ refund });
  } catch (err) {
    return handleApiError(err);
  }
}
