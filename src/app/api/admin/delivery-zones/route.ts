import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliveryZoneSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { locations: true } } } });
    return NextResponse.json({ zones });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const data = deliveryZoneSchema.parse(await req.json());
    const zone = await prisma.deliveryZone.create({ data });
    return NextResponse.json({ zone }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
