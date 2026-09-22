import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");

    const [totalOrders, pendingOrders, totalRevenue, pendingVerifications, lowStock, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ["DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED"] } } }),
      prisma.paymentVerification.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, take: 10 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true } }),
    ]);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue._sum.total ?? 0,
      pendingVerifications,
      lowStock,
      recentOrders,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
