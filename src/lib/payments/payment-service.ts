import { randomUUID } from "crypto";
import type { PaymentMethodCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/registry";
import { PaymentProviderError } from "@/lib/payments/types";
import { writeAuditLog } from "@/lib/audit-log";

export function generateMerchantTransactionId(orderNumber: string): string {
  return `${orderNumber}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function calculatePaymentAmount(paymentMethodId: string, orderTotal: number): Promise<number> {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: paymentMethodId } });
  const fixedFee = Number(method.feeFixed);
  const percentFee = (Number(method.feePercent) / 100) * orderTotal;
  return Math.round((orderTotal + fixedFee + percentFee) * 100) / 100;
}

/** Creates a Payment row for an order and kicks off the provider's initiation flow. */
export async function initiatePaymentForOrder(
  orderId: string,
  paymentMethodCode: PaymentMethodCode,
  bankAccountId?: string,
  clientIp?: string,
) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const method = await prisma.paymentMethod.findUnique({ where: { code: paymentMethodCode } });

  if (!method || !method.isActive) {
    throw new PaymentProviderError(`Payment method ${paymentMethodCode} is not available`);
  }
  if (method.minAmount && Number(order.total) < Number(method.minAmount)) {
    throw new PaymentProviderError(`Order total is below the minimum of Tk ${method.minAmount} for ${method.displayName}`);
  }
  if (method.maxAmount && Number(order.total) > Number(method.maxAmount)) {
    throw new PaymentProviderError(`Order total exceeds the maximum of Tk ${method.maxAmount} for ${method.displayName}`);
  }

  const amount = await calculatePaymentAmount(method.id, Number(order.total));

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      paymentMethodId: method.id,
      bankAccountId: paymentMethodCode === "BANK_TRANSFER" ? bankAccountId : undefined,
      amount,
      merchantTransactionId: generateMerchantTransactionId(order.orderNumber),
      status: "PENDING",
      verificationStatus: paymentMethodCode === "COD" ? "NOT_REQUIRED" : "PENDING_REVIEW",
    },
  });

  const provider = getPaymentProvider(paymentMethodCode);

  try {
    const result = await provider.initiate({ payment, order, clientIp });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerTransactionId: result.providerTransactionId,
        status: result.requiresManualVerification ? "PENDING" : "PROCESSING",
      },
    });

    return { payment: updated, initiation: result };
  } catch (err) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw err;
  }
}

/**
 * Cash on Delivery has no online transaction to confirm ahead of time — the cash is collected
 * by the courier, so an order actually being delivered is the real-world signal that a COD
 * payment was collected. Called from every place an order can transition to DELIVERED (admin
 * status update, courier delivery webhook/status refresh) so a COD Payment row never sits at
 * PROCESSING forever even after the order is fully fulfilled and paid for.
 */
export async function resolveCodPaymentOnDelivery(orderId: string, verifiedByUserId?: string) {
  await prisma.payment.updateMany({
    where: { orderId, status: { in: ["PENDING", "PROCESSING"] }, paymentMethod: { code: "COD" } },
    data: { status: "SUCCESS", verificationStatus: "VERIFIED", verifiedByUserId, verifiedAt: new Date() },
  });
}

async function markOrderConfirmedIfPaid(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === "PENDING") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "CONFIRMED", note: "Payment confirmed" },
    });
  }
}

/** Handles the customer's browser being redirected back from a hosted checkout gateway. */
export async function handlePaymentCallback(code: PaymentMethodCode, payload: Record<string, unknown>) {
  const provider = getPaymentProvider(code);
  if (!provider.handleCallback) throw new PaymentProviderError(`${code} does not support callback handling`);

  const merchantTransactionId = String(
    payload.merchantInvoiceNumber ?? payload.tran_id ?? payload.orderId ?? payload.order_id ?? "",
  );
  const payment = merchantTransactionId
    ? await prisma.payment.findUnique({ where: { merchantTransactionId } })
    : null;
  if (!payment) throw new PaymentProviderError("Payment not found for callback");

  if (payment.status === "SUCCESS") {
    return { payment, alreadyProcessed: true };
  }

  const result = await provider.handleCallback(payload, payment);

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: result.status,
      providerTransactionId: result.providerTransactionId ?? payment.providerTransactionId,
      providerResponse: result.rawResponse as object,
      verificationStatus: result.success ? "VERIFIED" : payment.verificationStatus,
    },
  });

  if (result.success) {
    await markOrderConfirmedIfPaid(payment.orderId);
  }

  return { payment: updated, alreadyProcessed: false, result };
}

/** Handles a server-to-server webhook / IPN. Always re-verifies with the provider, never trusts the payload alone. */
export async function handlePaymentWebhook(code: PaymentMethodCode, rawBody: string, payload: Record<string, unknown>, signature: string | null) {
  const provider = getPaymentProvider(code);

  const merchantTransactionId = String(
    payload.merchantInvoiceNumber ?? payload.tran_id ?? payload.orderId ?? payload.order_id ?? "",
  );
  const payment = merchantTransactionId ? await prisma.payment.findUnique({ where: { merchantTransactionId } }) : null;

  const isVerified = provider.verifyWebhookSignature ? provider.verifyWebhookSignature(rawBody, signature) : true;

  const webhookEvent = await prisma.paymentWebhookEvent.create({
    data: {
      provider: code,
      eventType: String(payload.status ?? payload.eventType ?? "unknown"),
      paymentId: payment?.id,
      payload: payload as object,
      signature: signature ?? undefined,
      isVerified,
    },
  });

  if (!payment || !provider.handleWebhook) {
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { error: !payment ? "Payment not found" : "Provider has no webhook handler" },
    });
    return { processed: false };
  }

  if (payment.status === "SUCCESS") {
    await prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processed: true, processedAt: new Date() } });
    return { processed: true, alreadyProcessed: true };
  }

  const result = await provider.handleWebhook(payload, signature, payment);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: result.status,
      providerTransactionId: result.providerTransactionId ?? payment.providerTransactionId,
      providerResponse: result.rawResponse as object,
      verificationStatus: result.success ? "VERIFIED" : payment.verificationStatus,
    },
  });

  await prisma.paymentWebhookEvent.update({
    where: { id: webhookEvent.id },
    data: { processed: true, processedAt: new Date() },
  });

  if (result.success) {
    await markOrderConfirmedIfPaid(payment.orderId);
  }

  return { processed: true, alreadyProcessed: false, result };
}

/** Customer submits a manual transaction reference (Rocket / Bank Transfer / manual bKash-Nagad fallback). */
export async function submitManualPaymentVerification(params: {
  paymentId: string;
  submittedByUserId?: string;
  transactionId: string;
  senderNumber?: string;
  receiptUrl?: string;
  note?: string;
}) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: params.paymentId } });

  const verification = await prisma.paymentVerification.create({
    data: {
      paymentId: payment.id,
      submittedByUserId: params.submittedByUserId,
      transactionId: params.transactionId,
      senderNumber: params.senderNumber,
      receiptUrl: params.receiptUrl,
      note: params.note,
      status: "PENDING_REVIEW",
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionId: params.transactionId,
      senderNumber: params.senderNumber,
      receiptUrl: params.receiptUrl,
      status: "PROCESSING",
      verificationStatus: "PENDING_REVIEW",
    },
  });

  // Attempt automated reconciliation where the provider supports it (e.g. Rocket with a
  // merchant-specific verification API configured). Falls back to manual admin review.
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { id: payment.paymentMethodId } });
  const provider = getPaymentProvider(method.code);
  if (provider.queryStatus) {
    try {
      const result = await provider.queryStatus({ ...payment, transactionId: params.transactionId, senderNumber: params.senderNumber ?? null });
      if (result.success) {
        await approvePaymentVerification(verification.id, undefined, "Auto-verified via provider reconciliation API");
      }
    } catch {
      // Automated verification unavailable/failed — leave for manual admin review.
    }
  }

  return verification;
}

export async function approvePaymentVerification(verificationId: string, reviewedByUserId?: string, note?: string) {
  const verification = await prisma.paymentVerification.update({
    where: { id: verificationId },
    data: { status: "VERIFIED", reviewedByUserId, reviewedAt: new Date() },
  });

  const payment = await prisma.payment.update({
    where: { id: verification.paymentId },
    data: { status: "SUCCESS", verificationStatus: "VERIFIED", verifiedByUserId: reviewedByUserId, verifiedAt: new Date() },
  });

  await markOrderConfirmedIfPaid(payment.orderId);
  await writeAuditLog({
    userId: reviewedByUserId,
    action: "payment.verify.approve",
    entityType: "Payment",
    entityId: payment.id,
    newValue: { note },
  });

  return { verification, payment };
}

export async function rejectPaymentVerification(verificationId: string, reviewedByUserId: string, rejectionReason: string) {
  const verification = await prisma.paymentVerification.update({
    where: { id: verificationId },
    data: { status: "REJECTED", reviewedByUserId, reviewedAt: new Date(), rejectionReason },
  });

  const payment = await prisma.payment.update({
    where: { id: verification.paymentId },
    data: { status: "FAILED", verificationStatus: "REJECTED", rejectionReason },
  });

  await writeAuditLog({
    userId: reviewedByUserId,
    action: "payment.verify.reject",
    entityType: "Payment",
    entityId: payment.id,
    newValue: { rejectionReason },
  });

  return { verification, payment };
}

export async function refundPayment(paymentId: string, amount: number, reason: string, requestedByUserId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { paymentMethod: true } });

  if (amount > Number(payment.amount)) {
    throw new PaymentProviderError("Refund amount cannot exceed the original payment amount");
  }

  const refund = await prisma.refund.create({
    data: { paymentId, amount, reason, requestedByUserId, status: "PROCESSING" },
  });

  const provider = getPaymentProvider(payment.paymentMethod.code);

  if (!provider.supportsRefund || !provider.refund) {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
    throw new PaymentProviderError(`${payment.paymentMethod.displayName} does not support automated refunds; process manually and record the outcome.`);
  }

  let result;
  try {
    result = await provider.refund(payment, amount, reason);
  } catch (err) {
    // A thrown error (e.g. missing/invalid provider credentials, network failure) must still
    // leave the Refund row in a terminal state — never stuck at PROCESSING — so admins can see
    // and retry it instead of it silently vanishing into an unresolved limbo state.
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: "FAILED", providerResponse: { error: err instanceof Error ? err.message : String(err) } },
    });
    await writeAuditLog({
      userId: requestedByUserId,
      action: "payment.refund",
      entityType: "Refund",
      entityId: refund.id,
      newValue: { amount, reason, success: false, error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }

  const updatedRefund = await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: result.success ? "COMPLETED" : "FAILED",
      providerRefundId: result.providerRefundId,
      providerResponse: result.rawResponse as object,
      processedAt: result.success ? new Date() : undefined,
    },
  });

  if (result.success) {
    const fullyRefunded = amount >= Number(payment.amount);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
  }

  await writeAuditLog({
    userId: requestedByUserId,
    action: "payment.refund",
    entityType: "Refund",
    entityId: refund.id,
    newValue: { amount, reason, success: result.success },
  });

  return updatedRefund;
}
