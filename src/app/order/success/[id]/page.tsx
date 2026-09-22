import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { formatBDT, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import { PaymentStatusPanel } from "./payment-status";

export default async function OrderSuccessPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { paymentId?: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { include: { images: { take: 1 } } } } },
      payments: { include: { paymentMethod: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const session = await getCurrentSession();
  const isOwner = Boolean(session?.user && order.userId === session.user.id);
  const isStaff = Boolean(session?.user && ["ADMIN", "STAFF"].includes(session.user.role));
  if (order.userId && !isOwner && !isStaff) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Not authorized</h1>
        <p className="mt-2 text-sm text-gray-500">You do not have permission to view this order.</p>
      </div>
    );
  }

  const payment = searchParams.paymentId
    ? order.payments.find((p) => p.id === searchParams.paymentId)
    : order.payments[order.payments.length - 1];

  // A payment needs a customer-submitted transaction ID whenever its initiation flagged that
  // (payment.status stays PENDING until submitted — see initiatePaymentForOrder), or after an
  // admin rejects a prior submission and it needs to be corrected and resent. This is driven
  // entirely by the payment's own recorded state, not a hard-coded list of provider codes, so
  // it automatically covers bKash/Nagad in Manual mode without needing to special-case them.
  const needsManualSubmission = Boolean(
    payment && (payment.status === "PENDING" || payment.verificationStatus === "REJECTED"),
  );
  const initialShowForm = Boolean(
    payment && needsManualSubmission && payment.verificationStatus === "PENDING_REVIEW" && !payment.transactionId,
  );

  return (
    <div className="container-page py-8">
      <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-5">
        <h1 className="text-xl font-bold text-green-800">Thank you! Your order has been placed.</h1>
        <p className="mt-1 text-sm text-green-700">Order number: {order.orderNumber}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
              <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Placed on {formatDateTime(order.placedAt)}</p>

            <ul className="mt-4 divide-y divide-gray-100">
              {order.items.map((item) => {
                const image = item.product.images[0]?.url ?? "/uploads/products/placeholder.svg";
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <Image src={image} alt={item.nameSnapshot} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.nameSnapshot}</p>
                      <p className="text-xs text-gray-500">
                        {formatBDT(item.unitPrice.toString())} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatBDT(item.lineTotal.toString())}</p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{formatBDT(order.subtotal.toString())}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span>{formatBDT(order.shippingFee.toString())}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Discount</span>
                  <span>-{formatBDT(order.discount.toString())}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatBDT(order.total.toString())}</span>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Delivery Address</h2>
            <p className="text-sm text-gray-700">
              {order.shippingRecipient} — {order.shippingPhone}
              <br />
              {order.shippingAddressLine}, {order.shippingArea}, {order.shippingDistrict}, {order.shippingDivision}
              {order.shippingPostalCode ? ` — ${order.shippingPostalCode}` : ""}
            </p>
          </section>
        </div>

        <div className="space-y-6">
          {payment && (
            <PaymentStatusPanel
              paymentId={payment.id}
              needsManualSubmission={needsManualSubmission}
              initialShowForm={initialShowForm}
              initialPayment={{
                id: payment.id,
                status: payment.status,
                verificationStatus: payment.verificationStatus,
                amount: payment.amount.toString(),
                method: payment.paymentMethod.displayName,
                rejectionReason: payment.rejectionReason,
              }}
            />
          )}

          <div className="card space-y-3 p-5 text-sm">
            <Link href="/track-order" className="block text-brand-700 hover:underline">
              Track this order
            </Link>
            <Link href="/shop" className="block text-brand-700 hover:underline">
              Continue shopping
            </Link>
            {session?.user && (
              <Link href="/account/orders" className="block text-brand-700 hover:underline">
                View all my orders
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
