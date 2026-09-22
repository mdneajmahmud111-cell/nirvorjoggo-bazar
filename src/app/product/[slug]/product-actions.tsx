"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatBDT } from "@/lib/format";

export interface VariantOption {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export function ProductActions({
  productId,
  basePrice,
  comparePrice,
  baseStock,
  variants,
}: {
  productId: string;
  basePrice: number;
  comparePrice: number | null;
  baseStock: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | undefined>(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => (variantId ? variants.find((v) => v.id === variantId) : undefined),
    [variantId, variants],
  );
  const price = selected?.price ?? basePrice;
  const stock = variants.length > 0 ? (selected?.stock ?? 0) : baseStock;

  async function handleAddToCart() {
    if (stock < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add item to cart");
        return;
      }
      toast.success("Added to cart");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-brand-700">{formatBDT(price)}</span>
        {comparePrice && comparePrice > price && (
          <span className="text-base text-gray-400 line-through">{formatBDT(comparePrice)}</span>
        )}
      </div>

      {variants.length > 0 && (
        <div>
          <label className="label" htmlFor="variant">
            Variant
          </label>
          <select
            id="variant"
            className="input w-auto"
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setQuantity(1);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock < 1}>
                {v.name} {v.stock < 1 ? "(out of stock)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className="label">Quantity</span>
        <div className="flex w-fit items-center rounded-md border border-gray-300">
          <button
            type="button"
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            disabled={quantity >= stock}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {stock < 1 ? (
        <p className="text-sm font-medium text-red-600">Out of stock</p>
      ) : stock <= 5 ? (
        <p className="text-sm text-amber-600">Only {stock} left in stock</p>
      ) : null}

      <button
        type="button"
        className="btn-primary w-full sm:w-auto"
        onClick={handleAddToCart}
        disabled={submitting || stock < 1}
      >
        {submitting ? "Adding…" : "Add to Cart"}
      </button>
    </div>
  );
}
