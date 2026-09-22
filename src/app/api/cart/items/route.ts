import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCart, cartTotals } from "@/lib/cart";
import { handleApiError, jsonError } from "@/lib/api-response";

const addItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(100).default(1),
});

export async function POST(req: Request) {
  try {
    const data = addItemSchema.parse(await req.json());
    const cart = await resolveCart();

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product || !product.isActive) return jsonError("Product not found", 404);

    const stock = data.variantId
      ? (await prisma.productVariant.findUnique({ where: { id: data.variantId } }))?.stock ?? 0
      : product.stock;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId: data.productId, variantId: data.variantId ?? null } as any },
    }).catch(() => null);

    const desiredQty = (existing?.quantity ?? 0) + data.quantity;
    if (desiredQty > stock) return jsonError(`Only ${stock} in stock`, 422);

    await prisma.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId: cart.id, productId: data.productId, variantId: data.variantId ?? null } as any },
      create: { cartId: cart.id, productId: data.productId, variantId: data.variantId, quantity: data.quantity },
      update: { quantity: desiredQty },
    });

    const updated = await resolveCart();
    return NextResponse.json({ cart: updated, totals: cartTotals(updated.items) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
