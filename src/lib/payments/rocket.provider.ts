import type { Payment } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { PaymentCallbackResult, PaymentInitiationContext, PaymentInitiationResult, PaymentProvider } from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * Rocket (DBBL Mobile Banking) integration.
 *
 * DBBL does not publish a general tokenized merchant checkout API equivalent to bKash/Nagad's
 * Checkout API for arbitrary merchants — Rocket merchant integration in practice is either a
 * bespoke server-to-server arrangement negotiated directly with DBBL, or (for the majority of
 * merchants) the "Send Money" reconciliation flow: the merchant publishes its registered Rocket
 * merchant number, the customer sends money via *322# USSD (or the Rocket app) and reports back
 * the transaction ID, and the merchant reconciles it.
 *
 * This adapter implements that real flow honestly:
 *  - it never claims a payment succeeded without a transaction ID the customer actually sent
 *  - if ROCKET_VERIFICATION_API_URL/KEY are configured (a merchant-specific reconciliation API
 *    issued by DBBL for that merchant), it calls it server-to-server to auto-verify the
 *    transaction; otherwise the submission is queued for manual admin verification.
 */

interface RocketVerifyResponse {
  verified: boolean;
  amount?: string;
  senderNumber?: string;
  transactionId?: string;
  message?: string;
}

async function getMerchantNumber(): Promise<string> {
  const method = await prisma.paymentMethod.findUnique({ where: { code: "ROCKET" } });
  return method?.merchantNumber ?? env.rocket.merchantNumber();
}

export const RocketProvider: PaymentProvider = {
  code: "ROCKET",
  supportsRefund: false,
  isManual: true,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const merchantNumber = await getMerchantNumber();
    const instructions =
      `Dial *322# on your phone, choose "Cash Out" or "Send Money" to ${merchantNumber} ` +
      `(${env.rocket.merchantAccountType}), send Tk ${Number(ctx.payment.amount).toFixed(2)}, ` +
      `then enter the Transaction ID from the confirmation SMS on the next screen.`;

    await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", { merchantNumber }, { instructions });

    return {
      instructions,
      requiresManualVerification: true,
      rawResponse: { merchantNumber },
    };
  },

  /**
   * Called after the customer submits their Rocket transaction ID (see
   * PaymentVerification / manual-payment-submission API). Attempts automated
   * verification when a reconciliation API is configured for this merchant;
   * otherwise leaves the payment PENDING_REVIEW for an admin.
   */
  async queryStatus(payment: Payment): Promise<PaymentCallbackResult> {
    if (!env.rocket.verificationApiUrl || !payment.transactionId) {
      return { success: false, status: "PROCESSING", message: "Awaiting manual verification" };
    }

    const res = await fetch(env.rocket.verificationApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.rocket.verificationApiKey ?? ""}`,
      },
      body: JSON.stringify({
        merchantNumber: await getMerchantNumber(),
        transactionId: payment.transactionId,
        senderNumber: payment.senderNumber,
        amount: Number(payment.amount).toFixed(2),
      }),
      cache: "no-store",
    }).catch((err) => {
      throw new PaymentProviderError(`Rocket verification API unreachable: ${(err as Error).message}`);
    });

    const json = (await res.json().catch(() => ({}))) as RocketVerifyResponse;
    await recordTransaction(payment.id, "QUERY", json.verified ? "SUCCESS" : "FAILED", { transactionId: payment.transactionId }, json, payment.transactionId);

    const amountMatches = json.amount ? Math.abs(parseFloat(json.amount) - Number(payment.amount)) < 0.01 : false;

    return {
      success: Boolean(json.verified) && amountMatches,
      status: json.verified && amountMatches ? "SUCCESS" : "FAILED",
      providerTransactionId: payment.transactionId,
      amountVerified: amountMatches,
      message: json.message,
      rawResponse: json,
    };
  },
};
