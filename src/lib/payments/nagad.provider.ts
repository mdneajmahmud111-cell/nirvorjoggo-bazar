import { publicEncrypt, randomBytes, createSign, constants } from "crypto";
import type { Payment } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { PaymentCallbackResult, PaymentInitiationContext, PaymentInitiationResult, PaymentProvider } from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * Nagad payment method — supports two modes, switchable by the admin at any time with no
 * checkout rebuild required:
 *
 *  - MANUAL: the owner's personal/merchant Nagad number is shown to the customer, who sends
 *    money via the Nagad app's "Send Money" and submits the Transaction ID for admin review.
 *    Needs no API credentials at all.
 *  - AUTOMATIC: Nagad Merchant Checkout API (RSA-based signing/encryption). Official spec:
 *    https://developer.mynagad.com/
 *    Flow: initialize (send RSA-signed challenge) -> Nagad returns paymentReferenceId +
 *    challenge -> complete initialize with signed order payload -> Nagad returns callBackUrl ->
 *    customer completes payment on Nagad -> Nagad redirects to our callback with
 *    payment_ref_id + status -> we independently call the verify/payment endpoint (never trust
 *    the redirect query params alone). Requires NAGAD_MERCHANT_ID/MERCHANT_NUMBER/
 *    MERCHANT_PRIVATE_KEY/PUBLIC_KEY to be set.
 */

/**
 * Encrypts a plaintext string with Nagad's RSA public key (PKCS1 padding), per Nagad's
 * Merchant Checkout API spec (confirmed against the reference `openssl_public_encrypt`
 * implementation widely used for this integration).
 */
function encryptWithPublicKey(plaintext: string): string {
  return publicEncrypt({ key: env.nagad.publicKey(), padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plaintext)).toString("base64");
}

/**
 * Signs a plaintext string with the merchant's RSA private key (SHA256withRSA). Nagad requires
 * the `signature` to be computed over the EXACT SAME plaintext JSON string that is passed to
 * `encryptWithPublicKey` for `sensitiveData` — never a field concatenation and never the
 * ciphertext — otherwise Nagad's signature verification rejects the request.
 */
function sign(plaintext: string): string {
  const signer = createSign("SHA256");
  signer.update(plaintext);
  signer.end();
  return signer.sign(env.nagad.privateKey(), "base64");
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

async function getMethodConfig() {
  return prisma.paymentMethod.findUnique({ where: { code: "NAGAD" } });
}

export const NagadProvider: PaymentProvider = {
  code: "NAGAD",
  supportsRefund: false,
  // isManual reflects the common case; the actual mode is decided per-payment in initiate()
  // below from the admin-configured PaymentMethod.mode, since Nagad can run either way.
  isManual: false,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const method = await getMethodConfig();

    if (method?.mode === "MANUAL") {
      if (!method.merchantNumber) {
        throw new PaymentProviderError("Nagad is set to manual mode but no personal/merchant number has been configured by the admin yet");
      }
      const instructions =
        `Open your Nagad app, choose "Send Money", send Tk ${Number(ctx.payment.amount).toFixed(2)} to ` +
        `${method.merchantNumber}, then enter the Transaction ID from the confirmation SMS on the next screen.`;
      await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", { mode: "MANUAL", merchantNumber: method.merchantNumber }, { instructions });
      return { instructions, requiresManualVerification: true, rawResponse: { mode: "MANUAL", merchantNumber: method.merchantNumber } };
    }

    const merchantId = env.nagad.merchantId();
    const orderId = ctx.payment.merchantTransactionId;
    const clientIp = ctx.clientIp || "127.0.0.1";
    const challenge = randomBytes(20).toString("hex");
    // Computed once and reused for the encrypted payload, the signature, and the transmitted
    // `dateTime` field — calling this separately for each would let the clock tick over between
    // calls and produce a signature that doesn't match the timestamp Nagad actually receives.
    const datetime = dateTimeStamp();

    const initPlaintext = JSON.stringify({ merchantId, datetime, orderId, challenge });
    const initSensitive = encryptWithPublicKey(initPlaintext);
    const initSignature = sign(initPlaintext);

    const initResponse = await nagadFetch<InitResponse>(
      `/check-out/initialize/${merchantId}/${orderId}`,
      baseHeaders(clientIp),
      { accountNumber: env.nagad.merchantNumber(), dateTime: datetime, sensitiveData: initSensitive, signature: initSignature },
    );

    await recordTransaction(ctx.payment.id, "TOKEN", "SUCCESS", { orderId }, initResponse, initResponse.paymentReferenceId);

    const amount = Number(ctx.payment.amount).toFixed(2);
    const completePlaintext = JSON.stringify({
      merchantId,
      orderId,
      currencyCode: "050",
      amount,
      challenge: initResponse.challenge,
    });
    const completeSensitive = encryptWithPublicKey(completePlaintext);
    const completeSignature = sign(completePlaintext);

    const completeResponse = await nagadFetch<CompleteResponse>(
      `/check-out/complete/${initResponse.paymentReferenceId}`,
      baseHeaders(clientIp),
      { sensitiveData: completeSensitive, signature: completeSignature, merchantCallbackURL: env.nagad.callbackUrl() },
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
    // A manually-submitted payment never went through the automated initialize/complete flow,
    // so it has no real Nagad paymentReferenceId — never call Nagad's API with one, just leave
    // it for manual admin review (see submitManualPaymentVerification / /admin/payments).
    if (!payment.providerTransactionId) {
      return { success: false, status: "PROCESSING", message: "Awaiting manual verification" };
    }
    return verifyWithNagad(payment, payment.providerTransactionId);
  },

  // Nagad's Checkout API has no separate signed IPN/webhook for this flow — verification happens
  // by calling GET /verify/payment/{paymentRefId} ourselves (see handleCallback/queryStatus
  // above), which is why there is no handleWebhook/verifyWebhookSignature implementation here.
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
