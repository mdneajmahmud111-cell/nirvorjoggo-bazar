import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/payments/audit", () => ({ recordTransaction: vi.fn() }));
vi.mock("@/lib/env", () => ({
  env: {
    sslcommerz: {
      storeId: () => "test_store",
      storePassword: () => "test_pass",
      isLive: () => false,
      successUrl: () => "http://localhost:3000/api/payments/sslcommerz/success",
      failUrl: () => "http://localhost:3000/api/payments/sslcommerz/fail",
      cancelUrl: () => "http://localhost:3000/api/payments/sslcommerz/cancel",
      ipnUrl: () => "http://localhost:3000/api/payments/sslcommerz/ipn",
    },
  },
}));

import { SSLCommerzProvider } from "@/lib/payments/sslcommerz.provider";

function mockFetchOnce(body: unknown, ok = true) {
  global.fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 400, statusText: "", json: async () => body }) as unknown as Response);
}

const basePayment = {
  id: "pay_1",
  orderId: "order_1",
  amount: 750 as unknown as any,
  merchantTransactionId: "NB-TEST-0002",
  providerResponse: null,
} as any;

const baseOrder = {
  orderNumber: "NB-TEST-0002",
  customerName: "Rahim Uddin",
  customerEmail: "rahim@example.com",
  customerPhone: "01812345678",
  shippingAddressLine: "House 1, Road 2",
  shippingDistrict: "Dhaka",
  shippingRecipient: "Rahim Uddin",
  shippingPostalCode: "1212",
  items: [{ quantity: 1 }],
} as any;

describe("SSLCommerzProvider.initiate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the gateway redirect URL on a successful session", async () => {
    mockFetchOnce({ status: "SUCCESS", sessionkey: "sess-1", GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/gw1" });
    const result = await SSLCommerzProvider.initiate({ payment: basePayment, order: baseOrder });
    expect(result.redirectUrl).toContain("sslcommerz.com");
    expect(result.providerTransactionId).toBe("sess-1");
  });

  it("throws when the gateway rejects the session", async () => {
    mockFetchOnce({ status: "FAILED", failedreason: "Invalid store credentials" });
    await expect(SSLCommerzProvider.initiate({ payment: basePayment, order: baseOrder })).rejects.toThrow(/Invalid store credentials/);
  });
});

describe("SSLCommerzProvider IPN / callback validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never trusts the callback payload directly — always re-validates via SSLCommerz's Validation API", async () => {
    mockFetchOnce({ status: "VALID", tran_id: "NB-TEST-0002", val_id: "val-1", amount: "750.00", currency: "BDT", bank_tran_id: "bank-1" });
    const result = await SSLCommerzProvider.handleCallback({ val_id: "val-1" }, basePayment);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("validationserverAPI.php"), expect.anything());
    expect(result.success).toBe(true);
  });

  it("rejects when the validated amount does not match our recorded payment amount", async () => {
    mockFetchOnce({ status: "VALID", tran_id: "NB-TEST-0002", val_id: "val-1", amount: "1.00", currency: "BDT" });
    const result = await SSLCommerzProvider.handleCallback({ val_id: "val-1" }, basePayment);
    expect(result.success).toBe(false);
  });

  it("rejects an unverifiable transaction id", async () => {
    mockFetchOnce({ status: "INVALID" });
    const result = await SSLCommerzProvider.handleWebhook({ val_id: "val-1" }, null, basePayment);
    expect(result.success).toBe(false);
  });
});
