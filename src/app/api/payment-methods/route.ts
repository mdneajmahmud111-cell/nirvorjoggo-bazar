import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

// This route has no dynamic API usage (no cookies/headers/searchParams), so Next.js would
// otherwise statically cache its response at `next build` time and keep serving THAT snapshot
// in production forever — meaning an admin activating/deactivating a payment method would never
// actually take effect at checkout without a full rebuild and redeploy. Forcing dynamic
// rendering makes every request re-read the current admin-configured state, which is the whole
// point of a switchable Manual/Automatic payment setup.
export const dynamic = "force-dynamic";

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
        mode: true,
      },
    });
    return NextResponse.json({ methods });
  } catch (err) {
    return handleApiError(err);
  }
}
