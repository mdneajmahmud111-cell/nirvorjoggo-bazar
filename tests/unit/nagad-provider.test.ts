import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync, privateDecrypt, createVerify, constants } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
const privatePem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

vi.mock("@/lib/payments/audit", () => ({ recordTransaction: vi.fn() }));
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
    const decrypted = JSON.parse(
      privateDecrypt({ key: privatePem, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(initBody.sensitiveData, "base64")).toString(),
    );
    expect(decrypted.merchantId).toBe("MERCHANT001");
    expect(decrypted.orderId).toBe("NB-TEST-0003");
    expect(typeof decrypted.challenge).toBe("string");

    // The signature must verify against the same payload with the public key.
    const verifier = createVerify("SHA256");
    verifier.update(`MERCHANT001NB-TEST-0003${initBody.dateTime}`);
    verifier.end();
    expect(verifier.verify(publicPem, initBody.signature, "base64")).toBe(true);

    const completeDecrypted = JSON.parse(
      privateDecrypt({ key: privatePem, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(completeBody.sensitiveData, "base64")).toString(),
    );
    expect(completeDecrypted.amount).toBe("1200.00");
    expect(completeDecrypted.challenge).toBe("challenge-xyz");
  });
});
