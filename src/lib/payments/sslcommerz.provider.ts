import type { Payment } from "@prisma/client";
import { env } from "@/lib/env";
import type { PaymentCallbackResult, PaymentInitiationContext, PaymentInitiationResult, PaymentProvider, RefundResult } from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * SSLCommerz Hosted Checkout (Session API v4) integration.
 * Official spec: https://developer.sslcommerz.com/doc/v4/
 */

function gatewayBase() {
  return env.sslcommerz.isLive() ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
}

interface SessionResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
}

interface ValidationResponse {
  status: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount?: string;
  currency: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
}

export const SSLCommerzProvider: PaymentProvider = {
  code: "SSLCOMMERZ",
  supportsRefund: true,
  isManual: false,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const body = new URLSearchParams({
      store_id: env.sslcommerz.storeId(),
      store_passwd: env.sslcommerz.storePassword(),
      total_amount: Number(ctx.payment.amount).toFixed(2),
      currency: "BDT",
      tran_id: ctx.payment.merchantTransactionId,
      success_url: env.sslcommerz.successUrl(),
      fail_url: env.sslcommerz.failUrl(),
      cancel_url: env.sslcommerz.cancelUrl(),
      ipn_url: env.sslcommerz.ipnUrl(),
      shipping_method: "Courier",
      product_name: `Order ${ctx.order.orderNumber}`,
      product_category: "General",
      product_profile: "general",
      num_of_item: String(ctx.order.items.length),
      cus_name: ctx.order.customerName,
      cus_email: ctx.order.customerEmail || "no-reply@nirvorjoggo-bazar.local",
      cus_add1: ctx.order.shippingAddressLine,
      cus_city: ctx.order.shippingDistrict,
      cus_postcode: ctx.order.shippingPostalCode || "1000",
      cus_country: "Bangladesh",
      cus_phone: ctx.order.customerPhone,
      ship_name: ctx.order.shippingRecipient,
      ship_add1: ctx.order.shippingAddressLine,
      ship_city: ctx.order.shippingDistrict,
      ship_postcode: ctx.order.shippingPostalCode || "1000",
      ship_country: "Bangladesh",
    });

    const res = await fetch(`${gatewayBase()}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as SessionResponse;
    await recordTransaction(
      ctx.payment.id,
      "CREATE",
      json.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      Object.fromEntries(body),
      json,
      json.sessionkey,
    );

    if (json.status !== "SUCCESS" || !json.GatewayPageURL) {
      throw new PaymentProviderError(`SSLCommerz session creation failed: ${json.failedreason ?? "unknown error"}`, json);
    }

    return {
      redirectUrl: json.GatewayPageURL,
      providerTransactionId: json.sessionkey,
      requiresManualVerification: false,
      rawResponse: json,
    };
  },

  async handleCallback(payload, payment: Payment): Promise<PaymentCallbackResult> {
    const valId = String(payload.val_id ?? "");
    if (!valId) {
      return { success: false, status: "FAILED", message: "Missing val_id from SSLCommerz response", rawResponse: payload };
    }
    return validateWithSslcommerz(payment, valId);
  },

  async handleWebhook(payload, _signature, payment: Payment): Promise<PaymentCallbackResult> {
    const valId = String(payload.val_id ?? "");
    if (!valId) {
      return { success: false, status: "FAILED", message: "Missing val_id in IPN payload", rawResponse: payload };
    }
    return validateWithSslcommerz(payment, valId);
  },

  async refund(payment: Payment, amount: number, reason: string): Promise<RefundResult> {
    const bankTranId = (payment.providerResponse as { bank_tran_id?: string } | null)?.bank_tran_id;
    if (!bankTranId) {
      throw new PaymentProviderError("Cannot refund an SSLCommerz payment without a bank_tran_id");
    }

    const body = new URLSearchParams({
      bank_tran_id: bankTranId,
      refund_amount: amount.toFixed(2),
      refund_remarks: reason,
      store_id: env.sslcommerz.storeId(),
      store_passwd: env.sslcommerz.storePassword(),
      v: "1",
      format: "json",
    });

    const res = await fetch(`${gatewayBase()}/validator/api/refundAPI.php?${body.toString()}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { status?: string; refund_ref_id?: string; errorReason?: string };

    await recordTransaction(payment.id, "REFUND", json.status === "success" ? "SUCCESS" : "FAILED", Object.fromEntries(body), json, json.refund_ref_id);

    return {
      success: json.status === "success",
      providerRefundId: json.refund_ref_id,
      rawResponse: json,
      message: json.errorReason,
    };
  },
};

async function validateWithSslcommerz(payment: Payment, valId: string): Promise<PaymentCallbackResult> {
  const query = new URLSearchParams({
    val_id: valId,
    store_id: env.sslcommerz.storeId(),
    store_passwd: env.sslcommerz.storePassword(),
    format: "json",
  });

  const res = await fetch(`${gatewayBase()}/validator/api/validationserverAPI.php?${query.toString()}`, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as ValidationResponse;

  const isValid = json.status === "VALID" || json.status === "VALIDATED";
  await recordTransaction(payment.id, "QUERY", isValid ? "SUCCESS" : "FAILED", { valId }, json, json.bank_tran_id);

  const amountMatches = isValid ? Math.abs(parseFloat(json.amount) - Number(payment.amount)) < 1 : false;
  const tranMatches = json.tran_id === payment.merchantTransactionId;

  return {
    success: isValid && amountMatches && tranMatches,
    status: isValid && amountMatches && tranMatches ? "SUCCESS" : "FAILED",
    providerTransactionId: json.bank_tran_id ?? valId,
    amountVerified: amountMatches,
    amount: json.amount ? parseFloat(json.amount) : undefined,
    message: !isValid ? "SSLCommerz validation failed" : !amountMatches ? "Amount mismatch" : !tranMatches ? "Transaction ID mismatch" : undefined,
    rawResponse: json,
  };
}
