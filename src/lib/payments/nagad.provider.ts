import { createHash, publicEncrypt, randomBytes, createSign, createVerify, constants } from "crypto";
import type { Payment } from "@prisma/client";
import { env } from "@/lib/env";
import type { PaymentCallbackResult, PaymentInitiationContext, PaymentInitiationResult, PaymentProvider } from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * Nagad Merchant Checkout API integration.
 * Official spec: https://developer.mynagad.com/ (Checkout API — RSA based signing/encryption)
 *
 * Flow: initialize (send RSA-signed challenge) -> Nagad returns paymentReferenceId + challenge ->
 * complete initialize with signed order payload -> Nagad returns callBackUrl -> customer
 * completes payment on Nagad -> Nagad redirects to our callback with payment_ref_id + status ->
 * we independently call the verify/payment endpoint (never trust the redirect query params alone).
 */

function sensitiveDataEncrypt(data: object): string {
  const buffer = Buffer.from(JSON.stringify(data));
  return publicEncrypt(
    { key: env.nagad.publicKey(), padding: constants.RSA_PKCS1_PADDING },
    buffer,
  ).toString("base64");
}

function sign(data: string): string {
  const signer = createSign("SHA256");
  signer.update(data);
  signer.end();
  return signer.sign(env.nagad.privateKey(), "base64");
}

function verifySignature(data: string, signature: string): boolean {
  try {
    const verifier = createVerify("SHA256");
    verifier.update(data);
    verifier.end();
    return verifier.verify(env.nagad.publicKey(), signature, "base64");
  } catch {
    return false;
  }
}

function dateTimeStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

interface InitResponse {
  sensitiveData: string;
  signature: string;
  paymentReferenceId: string;
  challenge: string;
}

interface CompleteResponse {
  status: string;
  message?: string;
  callBackUrl?: string;
  paymentReferenceId?: string;
}

interface VerifyResponse {
  status: string;
  statusCode?: string;
  paymentRefId: string;
  issuerPaymentRefId?: string;
  orderId: string;
  amount: string;
  currencyCode?: string;
  clientMobileNo?: string;
  issuerName?: string;
}

async function nagadFetch<T>(path: string, headers: Record<string, string>, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const res = await fetch(`${env.nagad.baseUrl()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new PaymentProviderError(`Nagad API error (${res.status}): ${(json as any)?.message ?? res.statusText}`, json);
  }
  return json as T;
}

function baseHeaders(clientIp: string) {
  return {
    "X-KM-Api-Version": "v-0.2.0",
    "X-KM-IP-V4": clientIp,
    "X-KM-Client-Type": "PC_WEB",
  };
}

export const NagadProvider: PaymentProvider = {
  code: "NAGAD",
  supportsRefund: false,
  isManual: false,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const merchantId = env.nagad.merchantId();
    const orderId = ctx.payment.merchantTransactionId;
    const clientIp = "127.0.0.1";
    const challenge = randomBytes(20).toString("hex");

    const initSensitive = sensitiveDataEncrypt({ merchantId, datetime: dateTimeStamp(), orderId, challenge });
    const initSignature = sign(`${merchantId}${orderId}${dateTimeStamp()}`);

    const initResponse = await nagadFetch<InitResponse>(
      `/check-out/initialize/${merchantId}/${orderId}`,
      baseHeaders(clientIp),
      { accountNumber: env.nagad.merchantNumber(), dateTime: dateTimeStamp(), sensitiveData: initSensitive, signature: initSignature },
    );

    await recordTransaction(ctx.payment.id, "TOKEN", "SUCCESS", { orderId }, initResponse, initResponse.paymentReferenceId);

    const amount = Number(ctx.payment.amount).toFixed(2);
    const completeSensitive = sensitiveDataEncrypt({
      merchantId,
      orderId,
      currencyCode: "050",
      amount,
      challenge: initResponse.challenge,
    });

    const completeResponse = await nagadFetch<CompleteResponse>(
      `/check-out/complete/${initResponse.paymentReferenceId}`,
      baseHeaders(clientIp),
      { sensitiveData: completeSensitive, signature: sign(completeSensitive), merchantCallbackURL: env.nagad.callbackUrl() },
    );

    await recordTransaction(ctx.payment.id, "CREATE", completeResponse.callBackUrl ? "SUCCESS" : "FAILED", { orderId }, completeResponse, initResponse.paymentReferenceId);

    if (!completeResponse.callBackUrl) {
      throw new PaymentProviderError(`Nagad payment initialization failed: ${completeResponse.message}`, completeResponse);
    }

    return {
      redirectUrl: completeResponse.callBackUrl,
      providerTransactionId: initResponse.paymentReferenceId,
      requiresManualVerification: false,
      rawResponse: completeResponse,
    };
  },

  async handleCallback(payload, payment: Payment): Promise<PaymentCallbackResult> {
    const paymentRefId = String(payload.payment_ref_id ?? payment.providerTransactionId ?? "");
    if (!paymentRefId) {
      return { success: false, status: "FAILED", message: "Missing Nagad payment_ref_id", rawResponse: payload };
    }
    return verifyWithNagad(payment, paymentRefId);
  },

  async queryStatus(payment: Payment): Promise<PaymentCallbackResult> {
    if (!payment.providerTransactionId) {
      return { success: false, status: "FAILED", message: "No paymentReferenceId on record" };
    }
    return verifyWithNagad(payment, payment.providerTransactionId);
  },

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    return verifySignature(createHash("sha256").update(rawBody).digest("hex"), signature);
  },
};

async function verifyWithNagad(payment: Payment, paymentRefId: string): Promise<PaymentCallbackResult> {
  const response = await nagadFetch<VerifyResponse>(`/verify/payment/${paymentRefId}`, baseHeaders("127.0.0.1"), undefined, "GET");

  await recordTransaction(payment.id, "QUERY", response.status === "Success" ? "SUCCESS" : "FAILED", { paymentRefId }, response, response.issuerPaymentRefId);

  const isSuccess = response.status === "Success";
  const amountMatches = isSuccess ? Math.abs(parseFloat(response.amount) - Number(payment.amount)) < 0.01 : false;
  const orderMatches = response.orderId === payment.merchantTransactionId;

  return {
    success: isSuccess && amountMatches && orderMatches,
    status: isSuccess && amountMatches && orderMatches ? "SUCCESS" : "FAILED",
    providerTransactionId: response.issuerPaymentRefId,
    amountVerified: amountMatches,
    amount: parseFloat(response.amount),
    message: !amountMatches ? "Amount mismatch" : !orderMatches ? "Order ID mismatch" : undefined,
    rawResponse: response,
  };
}
