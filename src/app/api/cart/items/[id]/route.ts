import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCart, cartTotals } from "@/lib/cart";
import { handleApiError, jsonError } from "@/lib/api-response";

const updateSchema = z.object({ quantity: z.number().int().min(1).max(100) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { quantity } = updateSchema.parse(await req.json());
    const cart = await resolveCart();
    const item = cart.items.find((i) => i.id === params.id);
    if (!item) return jsonError("Cart item not found", 404);

    const stock = item.variant?.stock ?? item.product.stock;
    if (quantity > stock) return jsonError(`Only ${stock} in stock`, 422);

    await prisma.cartItem.update({ where: { id: params.id }, data: { quantity } });
    const updated = await resolveCart();
    return NextResponse.json({ cart: updated, totals: cartTotals(updated.items) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const cart = await resolveCart();
    const item = cart.items.find((i) => i.id === params.id);
    if (!item) return jsonError("Cart item not found", 404);

    await prisma.cartItem.delete({ where: { id: params.id } });
    const updated = await resolveCart();
    return NextResponse.json({ cart: updated, totals: cartTotals(updated.items) });
  } catch (err) {
    return handleApiError(err);
  }
}
