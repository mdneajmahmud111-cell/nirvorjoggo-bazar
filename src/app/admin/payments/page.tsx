import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "../_components/pagination";
import { PaymentsFilter } from "./_components/payments-filter";
import { PaymentsTable, type PaymentRowData } from "./_components/payments-table";
import type { PaymentStatus, Prisma, VerificationStatus } from "@prisma/client";

const PAGE_SIZE = 20;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; verificationStatus?: string; page?: string };
}) {
  await requireRole("ADMIN", "STAFF");

  const status = searchParams.status ?? "";
  const verificationStatus = searchParams.verificationStatus ?? "";
  const page = Math.max(1, Number(searchParams.page ?? "1"));

  const where: Prisma.PaymentWhereInput = {};
  if (status) where.status = status as PaymentStatus;
  if (verificationStatus) where.verificationStatus = verificationStatus as VerificationStatus;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { orderNumber: true, customerName: true, customerPhone: true } },
        paymentMethod: true,
        bankAccount: true,
        verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows: PaymentRowData[] = JSON.parse(JSON.stringify(items));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
      <PaymentsFilter status={status} verificationStatus={verificationStatus} />

      <div className="card overflow-hidden">
        <PaymentsTable items={rows} />
        <AdminPagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/payments"
          searchParams={{ status, verificationStatus }}
        />
      </div>
    </div>
  );
}
