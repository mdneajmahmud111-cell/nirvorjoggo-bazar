import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync, privateDecrypt, createVerify, constants } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
const privatePem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

vi.mock("@/lib/payments/audit", () => ({ recordTransaction: vi.fn() }));
// Automated-flow tests below need the provider to read AUTOMATIC mode from the DB — real
// deployments default Nagad to MANUAL (see the "manual mode" describe block further down for
// that path), so this must be pinned explicitly rather than relying on a default.
const findUniqueMock = vi.fn().mockResolvedValue({ mode: "AUTOMATIC", merchantNumber: null });
vi.mock("@/lib/prisma", () => ({ prisma: { paymentMethod: { findUnique: (...args: unknown[]) => findUniqueMock(...args) } } }));
vi.mock("@/lib/env", () => ({
  env: {
    nagad: {
      baseUrl: () => "https://sandbox.mynagad.com/remote-payment-gateway-1.0",
      merchantId: () => "MERCHANT001",
      merchantNumber: () => "01900000000",
      // The provider signs with ITS OWN private key and encrypts with Nagad's public key.
      // In this test we control both keys of a throwaway pair so we can verify what the
      // provider produces is genuinely valid RSA signing/encryption, not a stub.
      privateKey: () => privatePem,
      publicKey: () => publicPem,
      callbackUrl: () => "http://localhost:3000/api/payments/nagad/callback",
    },
  },
}));

import { NagadProvider } from "@/lib/payments/nagad.provider";

const basePayment = { id: "pay_1", orderId: "order_1", amount: 1200 as unknown as any, merchantTransactionId: "NB-TEST-0003" } as any;
const baseOrder = { items: [] } as any;

describe("NagadProvider.initiate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends genuinely RSA-encrypted sensitiveData and a verifiable SHA256withRSA signature", async () => {
    let initBody: any;
    let completeBody: any;

    global.fetch = vi.fn(async (url: any, options: any) => {
      const parsed = JSON.parse(options.body);
      if (String(url).includes("/check-out/initialize/")) {
        initBody = parsed;
        return {
          ok: true,
          json: async () => ({
            sensitiveData: "irrelevant-for-this-direction",
            signature: "irrelevant",
            paymentReferenceId: "ref-123",
            challenge: "challenge-xyz",
          }),
        } as Response;
      }
      completeBody = parsed;
      return { ok: true, json: async () => ({ status: "Success", callBackUrl: "https://sandbox.mynagad.com/pay/ref-123" }) } as Response;
    }) as unknown as typeof fetch;

    const result = await NagadProvider.initiate({ payment: basePayment, order: baseOrder });

    expect(result.redirectUrl).toBe("https://sandbox.mynagad.com/pay/ref-123");

    // The sensitiveData the provider sent to Nagad must be decryptable ONLY with the
    // matching RSA private key — proving it is real PKCS1 encryption, not base64 window-dressing.
    const initPlaintext = privateDecrypt(
      { key: privatePem, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(initBody.sensitiveData, "base64"),
    ).toString();
    const decrypted = JSON.parse(initPlaintext);
    expect(decrypted.merchantId).toBe("MERCHANT001");
    expect(decrypted.orderId).toBe("NB-TEST-0003");
    expect(decrypted.datetime).toBe(initBody.dateTime);
    expect(typeof decrypted.challenge).toBe("string");

    // Nagad requires the signature to be computed over the EXACT SAME plaintext that was
    // encrypted into sensitiveData — never a field concatenation, never the ciphertext. Verify
    // that property directly: the decrypted plaintext bytes must themselves verify the signature.
    const initVerifier = createVerify("SHA256");
    initVerifier.update(initPlaintext);
    initVerifier.end();
    expect(initVerifier.verify(publicPem, initBody.signature, "base64")).toBe(true);

    const completePlaintext = privateDecrypt(
      { key: privatePem, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(completeBody.sensitiveData, "base64"),
    ).toString();
    const completeDecrypted = JSON.parse(completePlaintext);
    expect(completeDecrypted.amount).toBe("1200.00");
    expect(completeDecrypted.challenge).toBe("challenge-xyz");

    const completeVerifier = createVerify("SHA256");
    completeVerifier.update(completePlaintext);
    completeVerifier.end();
    expect(completeVerifier.verify(publicPem, completeBody.signature, "base64")).toBe(true);
  });

  it("reuses one timestamp across the encrypted payload, the signature, and the transmitted dateTime field", async () => {
    const seen: string[] = [];
    global.fetch = vi.fn(async (url: any, options: any) => {
      const parsed = JSON.parse(options.body);
      if (String(url).includes("/check-out/initialize/")) {
        seen.push(parsed.dateTime);
        const plaintext = privateDecrypt(
          { key: privatePem, padding: constants.RSA_PKCS1_PADDING },
          Buffer.from(parsed.sensitiveData, "base64"),
        ).toString();
        seen.push(JSON.parse(plaintext).datetime);
        return { ok: true, json: async () => ({ sensitiveData: "x", signature: "x", paymentReferenceId: "ref-123", challenge: "c" }) } as Response;
      }
      return { ok: true, json: async () => ({ status: "Success", callBackUrl: "https://sandbox.mynagad.com/pay/ref-123" }) } as Response;
    }) as unknown as typeof fetch;

    await NagadProvider.initiate({ payment: basePayment, order: baseOrder });

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });
});

describe("NagadProvider manual mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the admin-configured personal number and never calls the Nagad API, when mode is MANUAL", async () => {
    findUniqueMock.mockResolvedValueOnce({ mode: "MANUAL", merchantNumber: "01822223333" });
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await NagadProvider.initiate({ payment: basePayment, order: baseOrder });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.requiresManualVerification).toBe(true);
    expect(result.instructions).toContain("01822223333");
    expect(result.redirectUrl).toBeUndefined();
  });

  it("refuses to activate manual mode with no personal number configured", async () => {
    findUniqueMock.mockResolvedValueOnce({ mode: "MANUAL", merchantNumber: null });
    await expect(NagadProvider.initiate({ payment: basePayment, order: baseOrder })).rejects.toThrow(/no personal\/merchant number/i);
  });

  it("a manually-submitted payment (no real Nagad paymentReferenceId) is never queried against the live Nagad API", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await NagadProvider.queryStatus!({ ...basePayment, providerTransactionId: null });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.status).toBe("PROCESSING");
  });
});
