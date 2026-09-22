import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { formatBDT, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";

export default async function AccountOrdersPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login?callbackUrl=/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
  });

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500">You haven&rsquo;t placed any orders yet.</p>
          <Link href="/shop" className="btn-primary mt-6 inline-flex">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order/success/${order.id}`}
              className="card block p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{formatDate(order.placedAt)}</p>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {order.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={item.product.images[0]?.url ?? "/uploads/products/placeholder.svg"}
                      alt={item.nameSnapshot}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ))}
                {order.items.length > 4 && (
                  <span className="text-xs text-gray-500">+{order.items.length - 4} more</span>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">{formatBDT(order.total.toString())}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
