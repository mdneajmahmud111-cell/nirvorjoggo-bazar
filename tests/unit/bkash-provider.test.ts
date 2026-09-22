import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/payments/audit", () => ({ recordTransaction: vi.fn() }));
vi.mock("@/lib/env", () => ({
  env: {
    appUrl: "http://localhost:3000",
    bkash: {
      baseUrl: () => "https://tokenized.pay.bka.sh/v1.2.0-beta",
      username: () => "sandboxUser",
      password: () => "sandboxPass",
      appKey: () => "app-key",
      appSecret: () => "app-secret",
      callbackUrl: () => "http://localhost:3000/api/payments/bkash/callback",
    },
  },
}));

function mockFetchSequence(responses: { body: unknown; ok?: boolean }[]) {
  let call = 0;
  global.fetch = vi.fn(async () => {
    const r = responses[call++];
    return { ok: r.ok ?? true, status: r.ok === false ? 400 : 200, statusText: "", json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

const basePayment = {
  id: "pay_1",
  orderId: "order_1",
  amount: 500 as unknown as any,
  merchantTransactionId: "NB-TEST-0001",
  providerTransactionId: null,
  transactionId: null,
} as any;

const baseOrder = { customerPhone: "01712345678", items: [] } as any;

const GRANT_RESPONSE = { body: { id_token: "token-abc", token_type: "Bearer", expires_in: 3600, refresh_token: "refresh-1" } };

// The provider caches its bKash token at module scope (correct production behavior — avoid
// re-authenticating on every call). Each test must therefore get a fresh module instance so a
// cached token from one test doesn't shift the mocked fetch sequence in the next.
async function freshProvider() {
  vi.resetModules();
  const mod = await import("@/lib/payments/bkash.provider");
  return mod.BkashProvider;
}

describe("BkashProvider.initiate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grants a token then creates a payment and returns the bKash redirect URL", async () => {
    const BkashProvider = await freshProvider();
    mockFetchSequence([
      GRANT_RESPONSE,
      {
        body: {
          paymentID: "TR0011",
          bkashURL: "https://tokenized.pay.bka.sh/checkout/TR0011",
          amount: "500",
          currency: "BDT",
          transactionStatus: "Initiated",
          merchantInvoiceNumber: "NB-TEST-0001",
          statusCode: "0000",
          statusMessage: "Successful",
        },
      },
    ]);

    const result = await BkashProvider.initiate({ payment: basePayment, order: baseOrder });

    expect(result.redirectUrl).toBe("https://tokenized.pay.bka.sh/checkout/TR0011");
    expect(result.providerTransactionId).toBe("TR0011");
    expect(result.requiresManualVerification).toBe(false);
  });
});

describe("BkashProvider.handleCallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats a cancelled checkout as a failure without calling execute", async () => {
    const BkashProvider = await freshProvider();
    mockFetchSequence([]);
    const result = await BkashProvider.handleCallback!({ paymentID: "TR0011", status: "cancel" }, basePayment);
    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
  });

  it("marks the payment successful only when amount and invoice both match", async () => {
    const BkashProvider = await freshProvider();
    mockFetchSequence([
      GRANT_RESPONSE,
      {
        body: {
          paymentID: "TR0011",
          trxID: "8XJ2ABC123",
          transactionStatus: "Completed",
          amount: "500",
          currency: "BDT",
          merchantInvoiceNumber: "NB-TEST-0001",
          statusCode: "0000",
          statusMessage: "Successful",
        },
      },
    ]);

    const result = await BkashProvider.handleCallback!({ paymentID: "TR0011", status: "success" }, basePayment);
    expect(result.success).toBe(true);
    expect(result.status).toBe("SUCCESS");
    expect(result.providerTransactionId).toBe("8XJ2ABC123");
  });

  it("rejects the payment when the executed amount does not match our recorded amount", async () => {
    const BkashProvider = await freshProvider();
    mockFetchSequence([
      GRANT_RESPONSE,
      {
        body: {
          paymentID: "TR0011",
          trxID: "8XJ2ABC123",
          transactionStatus: "Completed",
          amount: "999", // tampered / mismatched amount
          currency: "BDT",
          merchantInvoiceNumber: "NB-TEST-0001",
          statusCode: "0000",
          statusMessage: "Successful",
        },
      },
    ]);

    const result = await BkashProvider.handleCallback!({ paymentID: "TR0011", status: "success" }, basePayment);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/mismatch/i);
  });
});
