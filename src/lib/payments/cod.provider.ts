import type { PaymentInitiationContext, PaymentInitiationResult, PaymentProvider } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * Cash on Delivery: no online transaction. The order proceeds directly to fulfillment;
 * the payment is collected by the courier and confirmed by an admin/staff member once
 * the order is marked DELIVERED (see /admin/orders and /admin/payments flows).
 */
export const CashOnDeliveryProvider: PaymentProvider = {
  code: "COD",
  supportsRefund: false,
  isManual: true,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    const instructions = `Pay Tk ${Number(ctx.payment.amount).toFixed(2)} in cash to the courier upon delivery.`;
    await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", {}, { instructions });
    return { instructions, requiresManualVerification: false, rawResponse: {} };
  },
};
