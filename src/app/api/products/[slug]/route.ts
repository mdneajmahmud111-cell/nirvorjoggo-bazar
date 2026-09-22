import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api-response";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        images: { orderBy: { displayOrder: "asc" } },
        variants: true,
        category: true,
        reviews: { where: { isApproved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!product || !product.isActive) return jsonError("Product not found", 404);

    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}
