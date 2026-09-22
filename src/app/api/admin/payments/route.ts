import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { PaymentStatus, VerificationStatus, type Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const verificationStatus = searchParams.get("verificationStatus");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const where: Prisma.PaymentWhereInput = {};
    if (status && status in PaymentStatus) where.status = status as PaymentStatus;
    if (verificationStatus && verificationStatus in VerificationStatus) where.verificationStatus = verificationStatus as VerificationStatus;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: { select: { orderNumber: true, customerName: true, customerPhone: true } },
          paymentMethod: true,
          bankAccount: true,
          verifications: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    return handleApiError(err);
  }
}
