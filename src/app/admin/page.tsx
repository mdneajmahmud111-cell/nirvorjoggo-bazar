import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "./_components/badges";

export default async function AdminDashboardPage() {
  await requireRole("ADMIN", "STAFF");

  const [totalOrders, pendingOrders, totalRevenue, pendingVerifications, lowStock, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ["DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED"] } },
    }),
    prisma.paymentVerification.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: 5 } },
      select: { id: true, name: true, stock: true },
      take: 10,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true },
    }),
  ]);

  const stats = [
    { label: "Total Orders", value: totalOrders.toLocaleString("en-BD") },
    { label: "Pending Orders", value: pendingOrders.toLocaleString("en-BD") },
    { label: "Total Revenue", value: formatBDT(Number(totalRevenue._sum.total ?? 0)) },
    { label: "Pending Payment Verifications", value: pendingVerifications.toLocaleString("en-BD") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Low Stock Products</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">No low-stock products.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/admin/products/${product.id}/edit`} className="text-gray-900 hover:text-brand-700">
                    {product.name}
                  </Link>
                  <span className={`font-medium ${product.stock === 0 ? "text-red-600" : "text-yellow-700"}`}>
                    {product.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2 pr-4">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-brand-700 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{order.customerName}</td>
                      <td className="py-2 pr-4">{formatBDT(Number(order.total))}</td>
                      <td className="py-2 pr-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
