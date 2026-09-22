"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const PROVIDERS = [
  { value: "STEADFAST", label: "Steadfast" },
  { value: "PATHAO", label: "Pathao" },
];

export function OrderStatusForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update order status");
      toast.success("Order status updated");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
      <div>
        <label className="label" htmlFor="order-status">
          Status
        </label>
        <select id="order-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="order-note">
          Note (optional)
        </label>
        <textarea
          id="order-note"
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Updating..." : "Update Status"}
      </button>
    </form>
  );
}

export function ShipmentBooking({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [provider, setProvider] = useState("STEADFAST");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to book courier shipment");
      toast.success("Courier shipment booked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book courier shipment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-gray-900">Book Courier Shipment</h2>
      <div>
        <label className="label" htmlFor="provider">
          Provider
        </label>
        <select id="provider" className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Booking..." : "Book Shipment"}
      </button>
    </form>
  );
}
