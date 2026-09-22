import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatBDT, formatDateTime } from "@/lib/format";
import { OrderStatusBadge, PaymentStatusBadge, ShipmentStatusBadge, VerificationStatusBadge } from "../../_components/badges";
import { OrderStatusForm, ShipmentBooking } from "./_components/order-actions";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN", "STAFF");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { name: true, slug: true } } } },
      payments: {
        orderBy: { createdAt: "desc" },
        include: {
          paymentMethod: true,
          bankAccount: true,
          verifications: { orderBy: { createdAt: "desc" } },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      deliveryZone: true,
      courierShipments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Customer &amp; Shipping</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium text-gray-900">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900">{order.customerPhone}</dd>
              </div>
              {order.customerEmail && (
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">{order.customerEmail}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Recipient</dt>
                <dd className="font-medium text-gray-900">{order.shippingRecipient} ({order.shippingPhone})</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900">
                  {order.shippingAddressLine}, {order.shippingArea}, {order.shippingDistrict}, {order.shippingDivision}
                  {order.shippingPostalCode ? ` - ${order.shippingPostalCode}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Delivery Zone</dt>
                <dd className="font-medium text-gray-900">{order.deliveryZone?.name ?? "—"}</dd>
              </div>
              {order.customerNote && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Customer Note</dt>
                  <dd className="text-gray-900">{order.customerNote}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">Unit Price</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4">
                        {item.product ? (
                          <Link href={`/admin/products/${item.productId}/edit`} className="text-brand-700 hover:underline">
                            {item.nameSnapshot}
                          </Link>
                        ) : (
                          item.nameSnapshot
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">{item.skuSnapshot}</td>
                      <td className="py-2 pr-4">{formatBDT(Number(item.unitPrice))}</td>
                      <td className="py-2 pr-4">{item.quantity}</td>
                      <td className="py-2 pr-4 font-medium">{formatBDT(Number(item.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd>{formatBDT(Number(order.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Shipping Fee</dt>
                <dd>{formatBDT(Number(order.shippingFee))}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Discount</dt>
                  <dd>-{formatBDT(Number(order.discount))}</dd>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>{formatBDT(Number(order.total))}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Payments</h2>
            {order.payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payment records.</p>
            ) : (
              <ul className="space-y-4">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="rounded-md border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">{payment.paymentMethod.displayName}</span>
                      <div className="flex gap-2">
                        <PaymentStatusBadge status={payment.status} />
                        <VerificationStatusBadge status={payment.verificationStatus} />
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-gray-500">Amount</dt>
                        <dd>{formatBDT(Number(payment.amount))}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Merchant Txn ID</dt>
                        <dd className="break-all">{payment.merchantTransactionId}</dd>
                      </div>
                      {payment.providerTransactionId && (
                        <div>
                          <dt className="text-gray-500">Provider Txn ID</dt>
                          <dd className="break-all">{payment.providerTransactionId}</dd>
                        </div>
                      )}
                      {payment.bankAccount && (
                        <div>
                          <dt className="text-gray-500">Bank Account</dt>
                          <dd>
                            {payment.bankAccount.bankName} — {payment.bankAccount.accountNumber}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <Link href="/admin/payments" className="mt-2 inline-block text-xs text-brand-700 hover:underline">
                      Manage in Payments →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Status History</h2>
            {order.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No history recorded.</p>
            ) : (
              <ol className="space-y-3 border-l border-gray-200 pl-4">
                {order.statusHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-brand-600" />
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={h.status} />
                      <span className="text-xs text-gray-500">{formatDateTime(h.createdAt)}</span>
                    </div>
                    {h.note && <p className="mt-1 text-sm text-gray-700">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          <ShipmentBooking orderId={order.id} />

          <div className="card p-4">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Courier Shipments</h2>
            {order.courierShipments.length === 0 ? (
              <p className="text-sm text-gray-500">No shipments booked yet.</p>
            ) : (
              <ul className="space-y-3">
                {order.courierShipments.map((shipment) => (
                  <li key={shipment.id} className="rounded-md border border-gray-100 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{shipment.provider}</span>
                      <ShipmentStatusBadge status={shipment.status} />
                    </div>
                    {shipment.trackingCode && (
                      <p className="mt-1 text-gray-600">Tracking: {shipment.trackingCode}</p>
                    )}
                    {shipment.consignmentId && (
                      <p className="text-gray-600">Consignment: {shipment.consignmentId}</p>
                    )}
                    <p className="mt-1 text-gray-500">COD Amount: {formatBDT(Number(shipment.codAmount))}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(shipment.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
