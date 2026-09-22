import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  division: z.string().trim().min(1),
  district: z.string().trim().min(1),
  area: z.string().trim().min(1),
  deliveryZoneId: z.string().min(1),
});

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const locations = await prisma.masterLocation.findMany({ include: { deliveryZone: true }, orderBy: [{ division: "asc" }, { district: "asc" }] });
    return NextResponse.json({ locations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const data = schema.parse(await req.json());
    const location = await prisma.masterLocation.create({ data });
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
