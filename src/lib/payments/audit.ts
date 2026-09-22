import { prisma } from "@/lib/prisma";
import type { PaymentTransactionStatus, PaymentTransactionType } from "@prisma/client";

/** Every outbound call to a payment provider is logged for reconciliation and dispute handling. */
export async function recordTransaction(
  paymentId: string,
  type: PaymentTransactionType,
  status: PaymentTransactionStatus,
  requestPayload: unknown,
  responsePayload: unknown,
  providerTransactionId?: string | null,
  errorMessage?: string,
) {
  return prisma.paymentTransaction.create({
    data: {
      paymentId,
      type,
      status,
      providerTransactionId: providerTransactionId ?? undefined,
      requestPayload: requestPayload === undefined ? undefined : (requestPayload as object),
      responsePayload: responsePayload === undefined ? undefined : (responsePayload as object),
      errorMessage,
    },
  });
}
