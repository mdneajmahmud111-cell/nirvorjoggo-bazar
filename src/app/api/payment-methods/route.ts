import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        code: true,
        displayName: true,
        description: true,
        instructions: true,
        iconUrl: true,
        minAmount: true,
        maxAmount: true,
        feeFixed: true,
        feePercent: true,
        merchantNumber: true,
      },
    });
    return NextResponse.json({ methods });
  } catch (err) {
    return handleApiError(err);
  }
}
