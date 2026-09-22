import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bankAccountSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    const data = bankAccountSchema.partial().parse(await req.json());
    const account = await prisma.bankAccount.update({ where: { id: params.id }, data });
    return NextResponse.json({ account });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    await prisma.bankAccount.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
