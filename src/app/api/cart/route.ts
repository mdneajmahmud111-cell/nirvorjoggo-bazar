import { NextResponse } from "next/server";
import { resolveCart, cartTotals } from "@/lib/cart";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const cart = await resolveCart();
    return NextResponse.json({ cart, totals: cartTotals(cart.items) });
  } catch (err) {
    return handleApiError(err);
  }
}
