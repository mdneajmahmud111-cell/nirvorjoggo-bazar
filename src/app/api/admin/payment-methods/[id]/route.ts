import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentMethodUpdateSchema } from "@/lib/validation/admin";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { canActivatePaymentMethod } from "@/lib/payments/activation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN");
    const data = paymentMethodUpdateSchema.parse(await req.json());

    const before = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: params.id } });

    // Never let a method go live in checkout without what it actually needs to work — real
    // provider credentials for Automatic mode, or at least a merchant/personal number for
    // Manual mode — otherwise that gap is only discovered when a real customer's payment fails
    // mid-checkout. Evaluated against the state this update would produce, not just what's
    // already saved, so activating and configuring a number in the same request both apply.
    if (data.isActive === true) {
      const effective = {
        code: before.code,
        mode: data.mode ?? before.mode,
        merchantNumber: data.merchantNumber !== undefined ? data.merchantNumber : before.merchantNumber,
      };
      const check = canActivatePaymentMethod(effective);
      if (!check.ok) {
        return jsonError(`Cannot activate ${before.displayName}: ${check.reason}`, 422);
      }
    }

    const method = await prisma.paymentMethod.update({
      where: { id: params.id },
      data: { ...data, config: data.config === null ? undefined : (data.config as object | undefined) },
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "payment_method.update",
      entityType: "PaymentMethod",
      entityId: method.id,
      oldValue: before,
      newValue: method,
    });

    return NextResponse.json({ method });
  } catch (err) {
    return handleApiError(err);
  }
}
