import type { Order, OrderItem, Payment, PaymentMethodCode, PaymentStatus } from "@prisma/client";

export interface PaymentInitiationContext {
  payment: Payment;
  order: Order & { items: OrderItem[] };
}

export interface PaymentInitiationResult {
  /** Present for redirect-based gateways (bKash, SSLCommerz): send the customer's browser here. */
  redirectUrl?: string;
  /** Present for manual/instructions-based flows (Rocket, Bank Transfer, COD). */
  instructions?: string;
  providerTransactionId?: string;
  /** True when a human admin must confirm the payment before the order proceeds. */
  requiresManualVerification: boolean;
  rawResponse?: unknown;
}

export interface PaymentCallbackResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  amountVerified?: boolean;
  amount?: number;
  rawResponse?: unknown;
  message?: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
  rawResponse?: unknown;
  message?: string;
}

export interface PaymentProvider {
  code: PaymentMethodCode;
  supportsRefund: boolean;
  /** Requires the customer to submit a transaction reference manually for admin review. */
  isManual: boolean;

  initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult>;

  /** Browser redirect return (success/fail/cancel) from a hosted checkout gateway. */
  handleCallback?(payload: Record<string, unknown>, payment: Payment): Promise<PaymentCallbackResult>;

  /** Server-to-server webhook / IPN. Must independently verify with the provider before trusting it. */
  handleWebhook?(
    payload: Record<string, unknown>,
    signature: string | null,
    payment: Payment,
  ): Promise<PaymentCallbackResult>;

  verifyWebhookSignature?(rawBody: string, signature: string | null): boolean;

  queryStatus?(payment: Payment): Promise<PaymentCallbackResult>;

  refund?(payment: Payment, amount: number, reason: string): Promise<RefundResult>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly rawResponse?: unknown,
  ) {
    super(message);
  }
}
