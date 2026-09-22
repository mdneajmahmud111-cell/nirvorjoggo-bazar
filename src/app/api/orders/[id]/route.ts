import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api-response";
import { getCurrentSession } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        payments: { include: { paymentMethod: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        deliveryZone: true,
        courierShipments: true,
      },
    });
    if (!order) return jsonError("Order not found", 404);

    const session = await getCurrentSession();
    const isOwner = session?.user && order.userId === session.user.id;
    const isStaff = session?.user && ["ADMIN", "STAFF"].includes(session.user.role);
    if (order.userId && !isOwner && !isStaff) return jsonError("Not authorized to view this order", 403);

    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
