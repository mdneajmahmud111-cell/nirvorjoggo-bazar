import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/payments/audit", () => ({ recordTransaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { paymentMethod: { findUnique: vi.fn() } } }));
vi.mock("@/lib/env", () => ({
  env: {
    rocket: {
      merchantNumber: () => "01900000000",
      merchantAccountType: "Personal",
      verificationApiUrl: undefined as string | undefined,
      verificationApiKey: undefined as string | undefined,
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { RocketProvider } from "@/lib/payments/rocket.provider";

const basePayment = { id: "pay_1", amount: 300 as unknown as any, transactionId: null, senderNumber: null } as any;

describe("RocketProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is a manual payment method that never auto-succeeds without a customer-submitted transaction ID", () => {
    expect(RocketProvider.isManual).toBe(true);
    expect(RocketProvider.supportsRefund).toBe(false);
  });

  it("shows the admin-configured merchant number in the payment instructions, not a hard-coded one", async () => {
    (prisma.paymentMethod.findUnique as any).mockResolvedValue({ merchantNumber: "01711112222" });
    const result = await RocketProvider.initiate({ payment: basePayment, order: { items: [] } as any });
    expect(result.instructions).toContain("01711112222");
    expect(result.requiresManualVerification).toBe(true);
  });

  it("stays PROCESSING (awaiting manual review) when no reconciliation API is configured", async () => {
    const result = await RocketProvider.queryStatus!({ ...basePayment, transactionId: "TXN123" });
    expect(result.status).toBe("PROCESSING");
    expect(result.success).toBe(false);
  });

  it("auto-verifies through the merchant reconciliation API when one is configured and the amount matches", async () => {
    (env as any).rocket.verificationApiUrl = "https://dbbl.example/verify";
    (env as any).rocket.verificationApiKey = "secret";
    (prisma.paymentMethod.findUnique as any).mockResolvedValue({ merchantNumber: "01711112222" });

    global.fetch = vi.fn(async () => ({
      json: async () => ({ verified: true, amount: "300.00" }),
    })) as unknown as typeof fetch;

    const result = await RocketProvider.queryStatus!({ ...basePayment, transactionId: "TXN123", senderNumber: "01899998888" });
    expect(result.success).toBe(true);
    expect(result.status).toBe("SUCCESS");
  });

  it("does not verify when the reconciled amount differs from the recorded payment amount", async () => {
    (env as any).rocket.verificationApiUrl = "https://dbbl.example/verify";
    (env as any).rocket.verificationApiKey = "secret";
    (prisma.paymentMethod.findUnique as any).mockResolvedValue({ merchantNumber: "01711112222" });

    global.fetch = vi.fn(async () => ({
      json: async () => ({ verified: true, amount: "999.00" }),
    })) as unknown as typeof fetch;

    const result = await RocketProvider.queryStatus!({ ...basePayment, transactionId: "TXN123", senderNumber: "01899998888" });
    expect(result.success).toBe(false);
  });
});
