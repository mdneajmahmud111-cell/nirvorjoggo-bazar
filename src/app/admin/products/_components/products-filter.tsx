"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductsFilter({
  q,
  categoryId,
  categories,
}: {
  q: string;
  categoryId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q);

  function applyFilters(next: { q?: string; categoryId?: string }) {
    const params = new URLSearchParams();
    const nextQ = next.q ?? search;
    const nextCategory = next.categoryId ?? categoryId;
    if (nextQ) params.set("q", nextQ);
    if (nextCategory) params.set("categoryId", nextCategory);
    router.push(`/admin/products?${params.toString()}`);
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
        <label className="label" htmlFor="product-q">
          Search
        </label>
        <input
          id="product-q"
          className="input"
          placeholder="Name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="product-category">
          Category
        </label>
        <select
          id="product-category"
          className="input"
          value={categoryId}
          onChange={(e) => applyFilters({ categoryId: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
