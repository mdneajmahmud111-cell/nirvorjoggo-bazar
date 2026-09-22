"use client";

import { useRouter, usePathname } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/products";

export interface ShopFiltersCategory {
  slug: string;
  name: string;
}

export function ShopFilters({
  categories,
  currentCategory,
  currentSort,
  currentQ,
  showCategoryFilter = true,
}: {
  categories: ShopFiltersCategory[];
  currentCategory?: string;
  currentSort?: string;
  currentQ?: string;
  showCategoryFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "category" && currentCategory) params.set("category", currentCategory);
    if (key !== "sort" && currentSort) params.set("sort", currentSort);
    if (key !== "q" && currentQ) params.set("q", currentQ);
    if (value) params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParam("q", String(formData.get("q") ?? "").trim());
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm gap-2">
        <input
          type="search"
          name="q"
          defaultValue={currentQ}
          placeholder="Search products…"
          className="input"
        />
        <button type="submit" className="btn-secondary shrink-0">
          Search
        </button>
      </form>

      <div className="flex gap-2">
        {showCategoryFilter && (
          <select
            className="input w-auto"
            value={currentCategory ?? ""}
            onChange={(e) => updateParam("category", e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <select
          className="input w-auto"
          value={currentSort ?? "newest"}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
