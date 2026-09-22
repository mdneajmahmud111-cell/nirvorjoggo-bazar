import type { Payment } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type {
  PaymentCallbackResult,
  PaymentInitiationContext,
  PaymentInitiationResult,
  PaymentProvider,
  RefundResult,
} from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * bKash payment method — supports two modes, switchable by the admin at any time with no
 * checkout rebuild required:
 *
 *  - MANUAL: the owner's personal/merchant bKash number is shown to the customer, who sends
 *    money via the bKash app's "Send Money" and submits the Transaction ID for admin review.
 *    Needs no API credentials at all — this is how the store can launch before bKash merchant
 *    onboarding is complete.
 *  - AUTOMATIC: bKash Tokenized Checkout (PGW). Official spec:
 *    https://developer.bka.sh/docs/tokenized-checkout-url-setup
 *    Flow: grant token -> create payment -> customer completes on bKash's bkashURL ->
 *    bKash redirects back to our callback with paymentID + status -> execute payment ->
 *    bKash confirms trxID -> we verify amount/paymentID match before marking SUCCESS.
 *    Requires BKASH_USERNAME/PASSWORD/APP_KEY/APP_SECRET to be set.
 */

interface TokenGrantResponse {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface CreatePaymentResponse {
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
  statusCode: string;
  statusMessage: string;
}

interface ExecutePaymentResponse {
  paymentID: string;
  trxID?: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  paymentExecuteTime?: string;
  merchantInvoiceNumber: string;
  statusCode: string;
  statusMessage: string;
  payerReference?: string;
}

let cachedToken: { idToken: string; refreshToken: string; expiresAt: number } | null = null;

async function bkashFetch<T>(path: string, options: { method: "GET" | "POST"; body?: unknown; auth?: boolean; idToken?: string }): Promise<T> {
  const url = `${env.bkash.baseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (options.auth) {
    headers.Authorization = options.idToken ?? "";
    headers["X-APP-Key"] = env.bkash.appKey();
  }

  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as T & { statusCode?: string; statusMessage?: string };
  if (!res.ok) {
    throw new PaymentProviderError(`bKash API error (${res.status}): ${(json as any)?.statusMessage ?? res.statusText}`, json);
  }
  return json as T;
}

async function grantToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.idToken;
  }

  const res = await fetch(`${env.bkash.baseUrl()}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      username: env.bkash.username(),
      password: env.bkash.password(),
    },
    body: JSON.stringify({ app_key: env.bkash.appKey(), app_secret: env.bkash.appSecret() }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as TokenGrantResponse & { statusMessage?: string };
  if (!res.ok || !json.id_token) {
    throw new PaymentProviderError(`bKash token grant failed: ${json.statusMessage ?? res.statusText}`, json);
  }

  cachedToken = {
    idToken: json.id_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.idToken;
}

async function getMethodConfig() {
  return prisma.paymentMethod.findUnique({ where: { code: "BKASH" } });
}

export const BkashProvider: PaymentProvider = {
  code: "BKASH",
  supportsRefund: true,
  // isManual reflects the common case; the actual mode is decided per-payment in initiate()
  // below from the admin-configured PaymentMethod.mode, since bKash can run either way.
  isManual: false,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const method = await getMethodConfig();

    if (method?.mode === "MANUAL") {
      if (!method.merchantNumber) {
        throw new PaymentProviderError("bKash is set to manual mode but no personal/merchant number has been configured by the admin yet");
      }
      const instructions =
        `Open your bKash app, choose "Send Money", send Tk ${Number(ctx.payment.amount).toFixed(2)} to ` +
        `${method.merchantNumber}, then enter the Transaction ID from the confirmation SMS on the next screen.`;
      await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", { mode: "MANUAL", merchantNumber: method.merchantNumber }, { instructions });
      return { instructions, requiresManualVerification: true, rawResponse: { mode: "MANUAL", merchantNumber: method.merchantNumber } };
    }

    const idToken = await grantToken();

    const requestBody = {
      mode: "0011",
      payerReference: ctx.order.customerPhone,
      callbackURL: env.bkash.callbackUrl(),
      amount: Number(ctx.payment.amount).toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: ctx.payment.merchantTransactionId,
    };

    const response = await bkashFetch<CreatePaymentResponse>("/tokenized/checkout/create", {
      method: "POST",
      auth: true,
      idToken,
      body: requestBody,
    });

    await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", requestBody, response, response.paymentID);

    if (!response.bkashURL || !response.paymentID) {
      throw new PaymentProviderError(`bKash create payment failed: ${response.statusMessage}`, response);
    }

    return {
      redirectUrl: response.bkashURL,
      providerTransactionId: response.paymentID,
      requiresManualVerification: false,
      rawResponse: response,
    };
  },

  async handleCallback(payload, payment: Payment): Promise<PaymentCallbackResult> {
    const paymentID = String(payload.paymentID ?? "");
    const status = String(payload.status ?? "");

    if (status === "cancel" || status === "failure" || !paymentID) {
      await recordTransaction(payment.id, "CALLBACK", "FAILED", payload, { status }, paymentID);
      return { success: false, status: "FAILED", message: `bKash checkout ${status}`, rawResponse: payload };
    }

    const idToken = await grantToken();
    const execBody = { paymentID };
    const execResponse = await bkashFetch<ExecutePaymentResponse>("/tokenized/checkout/execute", {
      method: "POST",
      auth: true,
      idToken,
      body: execBody,
    });

    const isSuccess = execResponse.transactionStatus === "Completed" && execResponse.statusCode === "0000";
    await recordTransaction(
      payment.id,
      "EXECUTE",
      isSuccess ? "SUCCESS" : "FAILED",
      execBody,
      execResponse,
      execResponse.trxID ?? paymentID,
    );

    if (!isSuccess) {
      return {
        success: false,
        status: "FAILED",
        providerTransactionId: execResponse.trxID ?? paymentID,
        message: execResponse.statusMessage,
        rawResponse: execResponse,
      };
    }

    const amountMatches = Math.abs(parseFloat(execResponse.amount) - Number(payment.amount)) < 0.01;
    const invoiceMatches = execResponse.merchantInvoiceNumber === payment.merchantTransactionId;

    return {
      success: amountMatches && invoiceMatches,
      status: amountMatches && invoiceMatches ? "SUCCESS" : "FAILED",
      providerTransactionId: execResponse.trxID,
      amountVerified: amountMatches,
      amount: parseFloat(execResponse.amount),
      message: amountMatches && invoiceMatches ? undefined : "Amount or invoice mismatch between bKash response and order",
      rawResponse: execResponse,
    };
  },

  async queryStatus(payment: Payment): Promise<PaymentCallbackResult> {
    // A manually-submitted payment never went through the automated create/execute flow, so it
    // has no real bKash paymentID — never call bKash's API with one, just leave it for manual
    // admin review (see submitManualPaymentVerification / /admin/payments).
    if (!payment.providerTransactionId) {
      return { success: false, status: "PROCESSING", message: "Awaiting manual verification" };
    }

    const idToken = await grantToken();
    const body = { paymentID: payment.providerTransactionId };
    const response = await bkashFetch<ExecutePaymentResponse>("/tokenized/checkout/payment/status", {
      method: "POST",
      auth: true,
      idToken,
      body,
    });

    await recordTransaction(payment.id, "QUERY", "SUCCESS", body, response, response.trxID);

    const isSuccess = response.transactionStatus === "Completed";
    return {
      success: isSuccess,
      status: isSuccess ? "SUCCESS" : response.transactionStatus === "Initiated" ? "PENDING" : "FAILED",
      providerTransactionId: response.trxID,
      amount: parseFloat(response.amount),
      rawResponse: response,
    };
  },

  async refund(payment: Payment, amount: number, reason: string): Promise<RefundResult> {
    if (!payment.providerTransactionId) {
      throw new PaymentProviderError("Cannot refund a bKash payment without a paymentID");
    }
    const idToken = await grantToken();
    const body = {
      paymentID: payment.providerTransactionId,
      amount: amount.toFixed(2),
      trxID: payment.transactionId ?? payment.providerTransactionId,
      sku: `order-${payment.orderId}`,
      reason,
    };

    const response = await bkashFetch<{ refundTrxID?: string; transactionStatus?: string; statusMessage?: string }>(
      "/tokenized/checkout/payment/refund",
      { method: "POST", auth: true, idToken, body },
    );

    await recordTransaction(payment.id, "REFUND", response.refundTrxID ? "SUCCESS" : "FAILED", body, response, response.refundTrxID);

    return {
      success: Boolean(response.refundTrxID),
      providerRefundId: response.refundTrxID,
      rawResponse: response,
      message: response.statusMessage,
    };
  },
};
