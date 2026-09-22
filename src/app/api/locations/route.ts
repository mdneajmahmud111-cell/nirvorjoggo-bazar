import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

// See the identical note in src/app/api/payment-methods/route.ts — without this, an admin
// adding a new deliverable area would never show up at checkout until a redeploy.
export const dynamic = "force-dynamic";

/** Powers the cascading division/district/area picker at checkout — sourced entirely
 *  from admin-managed MasterLocation rows, so only actually-serviceable areas are offered. */
export async function GET() {
  try {
    const locations = await prisma.masterLocation.findMany({
      where: { deliveryZone: { isActive: true } },
      select: { division: true, district: true, area: true },
      orderBy: [{ division: "asc" }, { district: "asc" }, { area: "asc" }],
    });
    return NextResponse.json({ locations });
  } catch (err) {
    return handleApiError(err);
  }
}
