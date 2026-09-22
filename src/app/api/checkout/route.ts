import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validation/checkout";
import { calculateShippingFee, calculateCodSurcharge, ShippingCalculationError } from "@/lib/shipping/calculate";
import { initiatePaymentForOrder } from "@/lib/payments/payment-service";
import { PaymentProviderError } from "@/lib/payments/types";
import { handleApiError, jsonError } from "@/lib/api-response";
import { getCurrentSession } from "@/lib/rbac";
import { withIdempotency } from "@/lib/idempotency";
import { rateLimit, clientKeyFromRequest, clientIpFromRequest } from "@/lib/rate-limit";
import { writeAuditLog, requestMeta } from "@/lib/audit-log";

function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NB-${stamp}-${rand}`;
}

type CheckoutResponseBody =
  | { error: string }
  | {
      order: { id: string; orderNumber: string; total: number };
      payment: { id: string; status: string };
      redirectUrl?: string;
      instructions?: string;
      requiresManualVerification: boolean;
    };

export async function POST(req: Request) {
  try {
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "checkout"), { max: 20, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many checkout attempts. Please wait a moment and try again.", 429);

    const session = await getCurrentSession();
    const raw = await req.json();
    const data = checkoutSchema.parse(raw);
    const idempotencyKey = req.headers.get("Idempotency-Key");

    const result = await withIdempotency<CheckoutResponseBody>(idempotencyKey, "checkout", data, async () => {
      // 1. Resolve shipping address from the ACTUAL customer's submitted data — never a store default.
      let shippingAddress: {
        recipientName: string;
        phone: string;
        division: string;
        district: string;
        area: string;
        addressLine: string;
        postalCode?: string;
      };
      let addressId: string | undefined;

      if (data.addressId) {
        const address = await prisma.address.findUnique({ where: { id: data.addressId } });
        if (!address || (session?.user && address.userId !== session.user.id)) {
          return { status: 404, body: { error: "Address not found" } };
        }
        shippingAddress = { ...address, postalCode: address.postalCode ?? undefined };
        addressId = address.id;
      } else if (data.newAddress) {
        shippingAddress = data.newAddress;
        if (session?.user && data.newAddress.saveAddress) {
          const created = await prisma.address.create({
            data: {
              userId: session.user.id,
              recipientName: data.newAddress.recipientName,
              phone: data.newAddress.phone,
              division: data.newAddress.division,
              district: data.newAddress.district,
              area: data.newAddress.area,
              addressLine: data.newAddress.addressLine,
              postalCode: data.newAddress.postalCode,
            },
          });
          addressId = created.id;
        }
      } else {
        return { status: 422, body: { error: "An address is required" } };
      }

      // 2. Price and stock come from the database, never from the client payload.
      const productIds = data.items.map((i) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, include: { variants: true } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let cartWeightKg = 0;
      const orderItemsInput: { productId: string; variantId?: string; nameSnapshot: string; skuSnapshot: string; unitPrice: number; quantity: number; lineTotal: number }[] = [];

      for (const item of data.items) {
        const product = productMap.get(item.productId);
        if (!product) return { status: 422, body: { error: `Product ${item.productId} is not available` } };

        const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : undefined;
        if (item.variantId && !variant) return { status: 422, body: { error: `Selected variant is not available` } };

        const unitPrice = Number(variant?.price ?? product.price);
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
        subtotal += lineTotal;
        cartWeightKg += Number(product.weightKg) * item.quantity;

        orderItemsInput.push({
          productId: product.id,
          variantId: variant?.id,
          nameSnapshot: variant ? `${product.name} (${variant.name})` : product.name,
          skuSnapshot: variant?.sku ?? product.sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }
      subtotal = Math.round(subtotal * 100) / 100;

      // 3. Shipping fee from admin-configured delivery zones, never a hard-coded flat rate.
      let shipping;
      try {
        shipping = await calculateShippingFee({
          division: shippingAddress.division,
          district: shippingAddress.district,
          area: shippingAddress.area,
          cartWeightKg,
          cartSubtotal: subtotal,
        });
      } catch (err) {
        if (err instanceof ShippingCalculationError) return { status: 422, body: { error: err.message } };
        throw err;
      }

      let total = Math.round((subtotal + shipping.fee) * 100) / 100;
      if (data.paymentMethodCode === "COD") {
        const surcharge = await calculateCodSurcharge(shipping.deliveryZoneId, total);
        total = Math.round((total + surcharge) * 100) / 100;
      }

      // 4. Create the order and atomically reserve stock — never oversell.
      const order = await prisma.$transaction(async (tx) => {
        for (const item of orderItemsInput) {
          if (item.variantId) {
            const updated = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count === 0) throw new PaymentProviderError(`Insufficient stock for ${item.nameSnapshot}`);
          } else {
            const updated = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count === 0) throw new PaymentProviderError(`Insufficient stock for ${item.nameSnapshot}`);
          }
        }

        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: session?.user?.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail,
            addressId,
            shippingRecipient: shippingAddress.recipientName,
            shippingPhone: shippingAddress.phone,
            shippingAddressLine: shippingAddress.addressLine,
            shippingDivision: shippingAddress.division,
            shippingDistrict: shippingAddress.district,
            shippingArea: shippingAddress.area,
            shippingPostalCode: shippingAddress.postalCode,
            deliveryZoneId: shipping.deliveryZoneId,
            subtotal,
            shippingFee: shipping.fee,
            total,
            customerNote: data.customerNote,
            items: { create: orderItemsInput },
            statusHistory: { create: { status: "PENDING", note: "Order placed" } },
          },
          include: { items: true },
        });

        if (session?.user) {
          await tx.cartItem.deleteMany({ where: { cart: { userId: session.user.id }, productId: { in: productIds } } });
        }

        return created;
      });

      await writeAuditLog({
        userId: session?.user?.id,
        action: "order.create",
        entityType: "Order",
        entityId: order.id,
        newValue: { orderNumber: order.orderNumber, total },
        ...requestMeta(req),
      });

      // 5. Kick off the selected payment method's real provider flow.
      const { payment, initiation } = await initiatePaymentForOrder(
        order.id,
        data.paymentMethodCode,
        data.bankAccountId,
        clientIpFromRequest(req),
      );

      return {
        status: 201,
        body: {
          order: { id: order.id, orderNumber: order.orderNumber, total },
          payment: { id: payment.id, status: payment.status },
          redirectUrl: initiation.redirectUrl,
          instructions: initiation.instructions,
          requiresManualVerification: initiation.requiresManualVerification,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (err instanceof PaymentProviderError) {
      // Log the raw provider response server-side for debugging, but never forward a
      // third-party API's raw error body to the customer's browser.
      // eslint-disable-next-line no-console
      console.error("Checkout payment initiation failed", err.message, err.rawResponse);
      return jsonError(err.message, 422);
    }
    return handleApiError(err);
  }
}
