"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { bdPhoneSchema } from "@/lib/validation/auth";
import { formatBDT, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";

const trackSchema = z.object({
  orderNumber: z.string().trim().min(3, "Enter your order number"),
  phone: bdPhoneSchema,
});
type TrackInput = z.infer<typeof trackSchema>;

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  subtotal: string | number;
  shippingFee: string | number;
  placedAt: string;
  shippingRecipient: string;
  shippingAddressLine: string;
  shippingArea: string;
  shippingDistrict: string;
  shippingDivision: string;
  items: {
    id: string;
    nameSnapshot: string;
    quantity: number;
    lineTotal: string | number;
    product: { images: { url: string; altText?: string | null }[] };
  }[];
  statusHistory: { id: string; status: string; note?: string | null; createdAt: string }[];
  courierShipments: { id: string; provider: string; trackingCode?: string | null; status: string }[];
  payments: { status: string; paymentMethod: { displayName: string } }[];
}

export default function TrackOrderPage() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<TrackInput>({
    resolver: zodResolver(trackSchema),
    defaultValues: { orderNumber: "", phone: "" },
  });

  async function onSubmit(values: TrackInput) {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ orderNumber: values.orderNumber, phone: values.phone });
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        toast.error(data.error ?? "Order not found");
        return;
      }
      setOrder(data.order);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Track Your Order</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="card mb-8 max-w-lg space-y-4 p-5">
        <div>
          <label className="label" htmlFor="orderNumber">
            Order number
          </label>
          <input id="orderNumber" className="input" placeholder="NB-XXXXXX-XXXX" {...form.register("orderNumber")} />
          {form.formState.errors.orderNumber && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.orderNumber.message}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone number used for the order
          </label>
          <input id="phone" className="input" placeholder="01XXXXXXXXX" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Searching…" : "Track Order"}
        </button>
      </form>

      {searched && !loading && !order && (
        <p className="text-sm text-gray-500">
          No order found matching that order number and phone number. Please double-check and try again.
        </p>
      )}

      {order && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order {order.orderNumber}</h2>
                  <p className="text-sm text-gray-500">Placed on {formatDateTime(order.placedAt)}</p>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

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
                        <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatBDT(item.lineTotal)}</p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatBDT(order.total)}</span>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Status Timeline</h2>
              <ol className="space-y-4 border-l border-gray-200 pl-4">
                {order.statusHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />
                    <p className="text-sm font-medium text-gray-900">{ORDER_STATUS_LABELS[h.status] ?? h.status}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(h.createdAt)}</p>
                    {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </section>

            {order.courierShipments.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Courier Tracking</h2>
                <ul className="space-y-2 text-sm">
                  {order.courierShipments.map((shipment) => (
                    <li key={shipment.id} className="flex items-center justify-between">
                      <span className="text-gray-700">
                        {shipment.provider}
                        {shipment.trackingCode ? ` — ${shipment.trackingCode}` : ""}
                      </span>
                      <span className="badge bg-gray-100 text-gray-800">{shipment.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Delivery Address</h2>
              <p className="text-sm text-gray-700">
                {order.shippingRecipient}
                <br />
                {order.shippingAddressLine}, {order.shippingArea}, {order.shippingDistrict}, {order.shippingDivision}
              </p>
            </section>
            {order.payments.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">Payment</h2>
                {order.payments.map((p, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {p.paymentMethod.displayName} — <span className="font-medium">{p.status}</span>
                  </p>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
