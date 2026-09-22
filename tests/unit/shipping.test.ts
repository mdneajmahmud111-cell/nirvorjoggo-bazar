import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    masterLocation: { findFirst: vi.fn() },
    deliveryZone: { findUniqueOrThrow: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { calculateShippingFee, calculateCodSurcharge, ShippingCalculationError } from "@/lib/shipping/calculate";

describe("calculateShippingFee", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws for an undeliverable location", async () => {
    (prisma.masterLocation.findFirst as any).mockResolvedValue(null);
    await expect(
      calculateShippingFee({ division: "X", district: "Y", area: "Z", cartWeightKg: 1, cartSubtotal: 100 }),
    ).rejects.toBeInstanceOf(ShippingCalculationError);
  });

  it("computes base + weight fee from the matched zone", async () => {
    (prisma.masterLocation.findFirst as any).mockResolvedValue({
      deliveryZone: {
        id: "zone-1",
        name: "Inside Dhaka",
        isActive: true,
        baseFee: 70,
        perKgFee: 15,
        freeShippingThreshold: 2000,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
      },
    });

    const result = await calculateShippingFee({ division: "Dhaka", district: "Dhaka", area: "Gulshan", cartWeightKg: 3, cartSubtotal: 500 });

    // 1kg is free, 2kg extra * 15 = 30, + base 70 = 100
    expect(result.fee).toBe(100);
    expect(result.isFreeShipping).toBe(false);
    expect(result.zoneName).toBe("Inside Dhaka");
  });

  it("applies free shipping above the threshold", async () => {
    (prisma.masterLocation.findFirst as any).mockResolvedValue({
      deliveryZone: {
        id: "zone-1",
        name: "Inside Dhaka",
        isActive: true,
        baseFee: 70,
        perKgFee: 15,
        freeShippingThreshold: 2000,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
      },
    });

    const result = await calculateShippingFee({ division: "Dhaka", district: "Dhaka", area: "Gulshan", cartWeightKg: 3, cartSubtotal: 2500 });
    expect(result.fee).toBe(0);
    expect(result.isFreeShipping).toBe(true);
  });

  it("throws for an inactive zone", async () => {
    (prisma.masterLocation.findFirst as any).mockResolvedValue({
      deliveryZone: { id: "zone-1", name: "Old zone", isActive: false },
    });
    await expect(
      calculateShippingFee({ division: "Dhaka", district: "Dhaka", area: "Gulshan", cartWeightKg: 1, cartSubtotal: 100 }),
    ).rejects.toBeInstanceOf(ShippingCalculationError);
  });
});

describe("calculateCodSurcharge", () => {
  it("computes a percentage surcharge from the zone", async () => {
    (prisma.deliveryZone.findUniqueOrThrow as any).mockResolvedValue({ codSurchargePercent: 2 });
    const surcharge = await calculateCodSurcharge("zone-1", 1000);
    expect(surcharge).toBe(20);
  });
});
