import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const methods = await prisma.paymentMethod.findMany({ orderBy: { displayOrder: "asc" } });
    return NextResponse.json({ methods });
  } catch (err) {
    return handleApiError(err);
  }
}
