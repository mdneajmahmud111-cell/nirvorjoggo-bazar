import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";

const CART_COOKIE = "cart_session_id";

/** Resolves (or creates) the cart for the current visitor: their account cart if logged in,
 *  otherwise a guest cart tracked via an httpOnly session cookie. */
export async function resolveCart() {
  const session = await getCurrentSession();

  if (session?.user) {
    return prisma.cart.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      include: { items: { include: { product: { include: { images: { take: 1 } } }, variant: true } } },
    });
  }

  const cookieStore = cookies();
  let sessionId = cookieStore.get(CART_COOKIE)?.value;

  if (!sessionId) {
    sessionId = randomUUID();
    cookieStore.set(CART_COOKIE, sessionId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }

  return prisma.cart.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
    include: { items: { include: { product: { include: { images: { take: 1 } } }, variant: true } } },
  });
}

export function cartTotals(items: { quantity: number; product: { price: unknown }; variant: { price: unknown } | null }[]) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.variant?.price ?? item.product.price);
    return sum + price * item.quantity;
  }, 0);
  return { subtotal: Math.round(subtotal * 100) / 100 };
}
