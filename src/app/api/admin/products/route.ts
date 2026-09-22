import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, images: { take: 1 } },
      }),
      prisma.product.count(),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF");
    const data = productSchema.parse(await req.json());
    const { images, ...productData } = data;

    const product = await prisma.product.create({
      data: {
        ...productData,
        images: images ? { create: images.map((img, idx) => ({ url: img.url, altText: img.altText, displayOrder: idx })) } : undefined,
      },
      include: { images: true, category: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
