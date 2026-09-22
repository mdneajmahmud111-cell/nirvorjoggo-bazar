import { prisma } from "@/lib/prisma";

export class ShippingCalculationError extends Error {}

export interface ShippingEstimate {
  deliveryZoneId: string;
  zoneName: string;
  baseFee: number;
  weightFee: number;
  fee: number;
  isFreeShipping: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

/**
 * Resolves the delivery fee purely from admin-configured DeliveryZone/MasterLocation data —
 * there is no hard-coded flat rate anywhere in the codebase. If a location is not mapped to a
 * zone yet, this throws so checkout can surface a clear "not deliverable" message instead of
 * silently guessing a fee.
 */
export async function calculateShippingFee(params: {
  division: string;
  district: string;
  area: string;
  cartWeightKg: number;
  cartSubtotal: number;
}): Promise<ShippingEstimate> {
  const location = await prisma.masterLocation.findFirst({
    where: {
      division: { equals: params.division, mode: "insensitive" },
      district: { equals: params.district, mode: "insensitive" },
      area: { equals: params.area, mode: "insensitive" },
    },
    include: { deliveryZone: true },
  });

  if (!location || !location.deliveryZone.isActive) {
    throw new ShippingCalculationError(
      `We currently do not deliver to ${params.area}, ${params.district}. Please choose a different address.`,
    );
  }

  const zone = location.deliveryZone;
  const baseFee = Number(zone.baseFee);
  const extraWeight = Math.max(0, params.cartWeightKg - 1);
  const weightFee = extraWeight * Number(zone.perKgFee);

  const isFreeShipping = zone.freeShippingThreshold != null && params.cartSubtotal >= Number(zone.freeShippingThreshold);
  const fee = isFreeShipping ? 0 : Math.round((baseFee + weightFee) * 100) / 100;

  return {
    deliveryZoneId: zone.id,
    zoneName: zone.name,
    baseFee,
    weightFee,
    fee,
    isFreeShipping,
    estimatedDaysMin: zone.estimatedDaysMin,
    estimatedDaysMax: zone.estimatedDaysMax,
  };
}

export async function calculateCodSurcharge(deliveryZoneId: string, orderTotal: number): Promise<number> {
  const zone = await prisma.deliveryZone.findUniqueOrThrow({ where: { id: deliveryZoneId } });
  return Math.round(orderTotal * (Number(zone.codSurchargePercent) / 100) * 100) / 100;
}
