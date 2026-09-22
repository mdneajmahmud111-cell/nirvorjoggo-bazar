import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const categories = await prisma.category.findMany({ orderBy: { displayOrder: "asc" }, include: { _count: { select: { products: true } } } });
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF");
    const data = categorySchema.parse(await req.json());
    const category = await prisma.category.create({ data });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
