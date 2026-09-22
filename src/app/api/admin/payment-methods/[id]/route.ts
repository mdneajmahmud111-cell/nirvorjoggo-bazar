import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentMethodUpdateSchema } from "@/lib/validation/admin";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";
import { isProviderConfigured } from "@/lib/env";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN");
    const data = paymentMethodUpdateSchema.parse(await req.json());

    const before = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: params.id } });

    // Never let a method go live in checkout without its real provider credentials in place —
    // that would only be discovered when a real customer's payment fails mid-checkout.
    if (data.isActive === true && !isProviderConfigured(before.code)) {
      return jsonError(
        `Cannot activate ${before.displayName}: required environment variables for ${before.code} are not set on the server. See .env.example for the exact names, then redeploy before activating.`,
        422,
      );
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
