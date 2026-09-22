import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(48, Math.max(1, Number(searchParams.get("pageSize") ?? "12")));
    const sort = searchParams.get("sort") ?? "newest";

    const where: Prisma.ProductWhereInput = { isActive: true };
    if (category) where.category = { slug: category };
    if (featured === "true") where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : sort === "rating" ? { ratingAvg: "desc" } : { createdAt: "desc" };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { images: { orderBy: { displayOrder: "asc" }, take: 1 }, category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleApiError(err);
  }
}
