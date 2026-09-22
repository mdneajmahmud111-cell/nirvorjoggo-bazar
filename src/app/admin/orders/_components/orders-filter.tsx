"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export function OrdersFilter({ status, q }: { status: string; q: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  function applyFilters(next: { status?: string; q?: string }) {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextQ = next.q ?? search;
    if (nextStatus) params.set("status", nextStatus);
    if (nextQ) params.set("q", nextQ);
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        applyFilters({ q: search });
      }}
      className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="label" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          className="input"
          placeholder="Order number, phone, or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select
          id="status"
          className="input"
          value={status}
          onChange={(e) => applyFilters({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary">
        Search
      </button>
    </form>
  );
}
