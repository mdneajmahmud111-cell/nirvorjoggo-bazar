import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentMethodUpdateSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit-log";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN");
    const data = paymentMethodUpdateSchema.parse(await req.json());

    const before = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: params.id } });
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
