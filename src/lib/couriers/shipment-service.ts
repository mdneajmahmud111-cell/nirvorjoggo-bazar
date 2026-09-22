import type { CourierProvider as CourierProviderCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCourierAdapter } from "@/lib/couriers/registry";
import { resolveCodPaymentOnDelivery } from "@/lib/payments/payment-service";

export async function bookCourierShipment(orderId: string, provider: CourierProviderCode) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const hasCod = await prisma.payment.findFirst({
    where: { orderId, status: { in: ["PENDING", "PROCESSING"] }, paymentMethod: { code: "COD" } },
  });
  const codAmount = hasCod ? Number(order.total) : 0;

  const adapter = getCourierAdapter(provider);
  const result = await adapter.bookShipment({ order, codAmount });

  const shipment = await prisma.courierShipment.create({
    data: {
      orderId,
      provider,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      status: result.status,
      codAmount,
      responsePayload: result.rawResponse as object,
    },
  });

  await prisma.order.update({ where: { id: orderId }, data: { status: "PROCESSING" } });
  await prisma.orderStatusHistory.create({ data: { orderId, status: "PROCESSING", note: `Shipment booked via ${provider}` } });

  return shipment;
}

export async function refreshShipmentStatus(shipmentId: string) {
  const shipment = await prisma.courierShipment.findUniqueOrThrow({ where: { id: shipmentId } });
  if (!shipment.consignmentId) return shipment;

  const adapter = getCourierAdapter(shipment.provider);
  const result = await adapter.getStatus(shipment.consignmentId);

  const updated = await prisma.courierShipment.update({
    where: { id: shipmentId },
    data: { status: result.status, lastWebhook: result.rawResponse as object },
  });

  if (result.status === "DELIVERED") {
    await prisma.order.update({ where: { id: shipment.orderId }, data: { status: "DELIVERED" } });
    await prisma.orderStatusHistory.create({ data: { orderId: shipment.orderId, status: "DELIVERED", note: `Delivered (${shipment.provider})` } });
    await resolveCodPaymentOnDelivery(shipment.orderId);
  }

  return updated;
}
