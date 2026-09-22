import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validation/review";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const data = reviewSchema.parse(await req.json());

    // Only customers who actually purchased and received the product may review it.
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: { userId: session.user.id, status: "DELIVERED", ...(data.orderId ? { id: data.orderId } : {}) },
      },
      include: { order: true },
    });
    if (!purchase) return jsonError("You can only review products from a delivered order", 403);

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        userId: session.user.id,
        orderId: purchase.order.id,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        isApproved: false,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
