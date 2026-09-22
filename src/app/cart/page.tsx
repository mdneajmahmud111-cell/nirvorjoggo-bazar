"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatBDT } from "@/lib/format";

interface CartItemDto {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string | number;
    stock: number;
    images: { url: string; altText?: string | null }[];
  };
  variant: { id: string; name: string; price: string | number; stock: number } | null;
}

interface CartDto {
  id: string;
  items: CartItemDto[];
}

export default function CartPage() {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [totals, setTotals] = useState<{ subtotal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(data.cart);
    setTotals(data.totals);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function updateQuantity(itemId: string, quantity: number) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update quantity");
        return;
      }
      setCart(data.cart);
      setTotals(data.totals);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not remove item");
        return;
      }
      setCart(data.cart);
      setTotals(data.totals);
      toast.success("Item removed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading cart…</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-gray-500">Add some products to get started.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-flex">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your Cart</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => {
            const image = item.product.images[0]?.url ?? "/uploads/products/placeholder.svg";
            const unitPrice = Number(item.variant?.price ?? item.product.price);
            const stock = item.variant?.stock ?? item.product.stock;
            const isBusy = busyId === item.id;
            return (
              <div key={item.id} className="card flex gap-4 p-4">
                <Link href={`/product/${item.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  <Image src={image} alt={item.product.name} fill sizes="96px" className="object-cover" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/product/${item.product.slug}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {item.product.name}
                    </Link>
                    {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                    <p className="mt-1 text-sm font-semibold text-brand-700">{formatBDT(unitPrice)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        type="button"
                        className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isBusy || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isBusy || item.quantity >= stock}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline disabled:opacity-40"
                      onClick={() => removeItem(item.id)}
                      disabled={isBusy}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>
          <div className="flex justify-between text-sm text-gray-700">
            <span>Subtotal</span>
            <span>{formatBDT(totals?.subtotal ?? 0)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Shipping is calculated at checkout.</p>
          <Link href="/checkout" className="btn-primary mt-5 w-full">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
