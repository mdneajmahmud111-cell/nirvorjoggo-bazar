import type { PaymentMethodCode } from "@prisma/client";
import type { PaymentProvider } from "@/lib/payments/types";
import { BkashProvider } from "@/lib/payments/bkash.provider";
import { NagadProvider } from "@/lib/payments/nagad.provider";
import { RocketProvider } from "@/lib/payments/rocket.provider";
import { SSLCommerzProvider } from "@/lib/payments/sslcommerz.provider";
import { BankTransferProvider } from "@/lib/payments/bank-transfer.provider";
import { CashOnDeliveryProvider } from "@/lib/payments/cod.provider";

export const paymentProviderRegistry: Record<PaymentMethodCode, PaymentProvider> = {
  COD: CashOnDeliveryProvider,
  BKASH: BkashProvider,
  NAGAD: NagadProvider,
  ROCKET: RocketProvider,
  SSLCOMMERZ: SSLCommerzProvider,
  BANK_TRANSFER: BankTransferProvider,
};

export function getPaymentProvider(code: PaymentMethodCode): PaymentProvider {
  const provider = paymentProviderRegistry[code];
  if (!provider) throw new Error(`No payment provider registered for ${code}`);
  return provider;
}
