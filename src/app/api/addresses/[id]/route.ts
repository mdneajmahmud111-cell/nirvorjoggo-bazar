import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation/address";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";

async function assertOwnership(userId: string, id: string) {
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== userId) return null;
  return address;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const existing = await assertOwnership(session.user.id, params.id);
    if (!existing) return jsonError("Address not found", 404);

    const data = addressSchema.partial().parse(await req.json());
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    }

    const address = await prisma.address.update({ where: { id: params.id }, data });
    return NextResponse.json({ address });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireUser();
    const existing = await assertOwnership(session.user.id, params.id);
    if (!existing) return jsonError("Address not found", 404);

    await prisma.address.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
