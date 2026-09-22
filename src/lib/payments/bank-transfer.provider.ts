import { prisma } from "@/lib/prisma";
import type { PaymentInitiationContext, PaymentInitiationResult, PaymentProvider } from "@/lib/payments/types";
import { PaymentProviderError } from "@/lib/payments/types";
import { recordTransaction } from "@/lib/payments/audit";

/**
 * Bank Transfer: customer wires/deposits to one of the admin-configured BankAccount
 * records, then submits the transaction/reference number and (optionally) a receipt
 * image. An admin manually reconciles it against the bank statement and verifies or
 * rejects it — there is no public API for arbitrary inter-bank transfer verification
 * in Bangladesh, so this is inherently a manual-review payment method, implemented
 * honestly as such rather than faked as "auto-verified".
 */
export const BankTransferProvider: PaymentProvider = {
  code: "BANK_TRANSFER",
  supportsRefund: false,
  isManual: true,

  async initiate(ctx: PaymentInitiationContext): Promise<PaymentInitiationResult> {
    if (!ctx.payment.bankAccountId) {
      throw new PaymentProviderError("A bank account must be selected for a bank transfer payment");
    }

    const account = await prisma.bankAccount.findUnique({ where: { id: ctx.payment.bankAccountId } });
    if (!account || !account.isActive) {
      throw new PaymentProviderError("Selected bank account is not available");
    }

    const instructions =
      `Transfer Tk ${Number(ctx.payment.amount).toFixed(2)} to ${account.bankName} ` +
      `A/C Name: ${account.accountName}, A/C No: ${account.accountNumber}, Branch: ${account.branch}` +
      (account.routingNumber ? `, Routing No: ${account.routingNumber}` : "") +
      `. Then submit the transaction/reference number and deposit slip here. ` +
      (account.instructions ?? "");

    await recordTransaction(ctx.payment.id, "CREATE", "SUCCESS", { bankAccountId: account.id }, { instructions });

    return { instructions, requiresManualVerification: true, rawResponse: { bankAccountId: account.id } };
  },
};
