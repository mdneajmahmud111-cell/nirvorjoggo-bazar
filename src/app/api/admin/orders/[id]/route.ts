import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderStatusUpdateSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole("ADMIN", "STAFF");
    const data = orderStatusUpdateSchema.parse(await req.json());

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: data.status,
        cancelledAt: data.status === "CANCELLED" ? new Date() : undefined,
        statusHistory: { create: { status: data.status, note: data.note, changedByUserId: session.user.id } },
      },
    });

    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
