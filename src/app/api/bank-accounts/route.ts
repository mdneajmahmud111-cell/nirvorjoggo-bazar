import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

// See the identical note in src/app/api/payment-methods/route.ts — without this, an admin
// adding/activating a bank account would never show up at checkout until a redeploy.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
    return NextResponse.json({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}
