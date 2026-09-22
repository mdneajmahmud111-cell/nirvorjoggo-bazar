import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bdPhoneSchema } from "@/lib/validation/auth";
import { handleApiError, jsonError } from "@/lib/api-response";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

const schema = z.object({ orderNumber: z.string().trim().min(3), phone: bdPhoneSchema });

export async function GET(req: Request) {
  try {
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "orders:track"), { max: 30, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many tracking attempts. Please wait a moment.", 429);

    const { searchParams } = new URL(req.url);
    const data = schema.parse({ orderNumber: searchParams.get("orderNumber"), phone: searchParams.get("phone") });

    const order = await prisma.order.findFirst({
      where: { orderNumber: data.orderNumber, customerPhone: data.phone },
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        statusHistory: { orderBy: { createdAt: "asc" } },
        courierShipments: true,
        payments: { select: { status: true, paymentMethod: { select: { displayName: true } } } },
      },
    });

    if (!order) return jsonError("No order found matching that order number and phone number", 404);

    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
