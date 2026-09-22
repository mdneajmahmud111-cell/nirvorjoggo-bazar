import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await requireUser();
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
    });
    return NextResponse.json({ orders });
  } catch (err) {
    return handleApiError(err);
  }
}
