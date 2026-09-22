import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PaymentMethodCard, type PaymentMethodData } from "./_components/payment-method-card";

export default async function AdminPaymentMethodsPage() {
  await requireRole("ADMIN", "STAFF");

  const methods = await prisma.paymentMethod.findMany({ orderBy: { displayOrder: "asc" } });
  const rows: PaymentMethodData[] = JSON.parse(JSON.stringify(methods));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <p className="mt-1 text-sm text-gray-500">
          Toggle availability and edit customer-facing details for each of the 6 supported payment methods. Real
          provider secrets (bKash/Nagad app keys, SSLCommerz store password, etc.) are never entered here — they are
          configured via environment variables only. See .env.example for the authoritative list.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((method) => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}
      </div>
    </div>
  );
}
