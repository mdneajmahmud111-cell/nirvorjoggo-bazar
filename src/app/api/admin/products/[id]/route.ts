import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { images, ...data } = productSchema.partial().parse(await req.json());

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(images
          ? { images: { deleteMany: {}, create: images.map((img, idx) => ({ url: img.url, altText: img.altText, displayOrder: idx })) } }
          : {}),
      },
      include: { images: true, category: true },
    });

    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN");
    await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
