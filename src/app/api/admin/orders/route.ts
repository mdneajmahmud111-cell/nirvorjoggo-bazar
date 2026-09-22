import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { OrderStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const where: Prisma.OrderWhereInput = {};
    if (status && status in OrderStatus) where.status = status as OrderStatus;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true, payments: { include: { paymentMethod: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleApiError(err);
  }
}
