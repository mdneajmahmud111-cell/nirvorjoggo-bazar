import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { canActivatePaymentMethod } from "@/lib/payments/activation";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const methods = await prisma.paymentMethod.findMany({ orderBy: { displayOrder: "asc" } });
    // Reflects only whether this method CAN be activated (env vars present / manual number set)
    // — never any secret value itself, which never leaves env.ts.
    const withConfigStatus = methods.map((m) => ({ ...m, activation: canActivatePaymentMethod(m) }));
    return NextResponse.json({ methods: withConfigStatus });
  } catch (err) {
    return handleApiError(err);
  }
}
