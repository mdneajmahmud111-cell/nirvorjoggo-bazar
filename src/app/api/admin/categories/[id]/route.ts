import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN", "STAFF");
    const data = categorySchema.partial().parse(await req.json());
    const category = await prisma.category.update({ where: { id: params.id }, data });
    return NextResponse.json({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    await prisma.category.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
