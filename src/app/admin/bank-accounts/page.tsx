import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { BankAccountList } from "./_components/bank-account-list";
import type { BankAccountData } from "./_components/bank-account-form";

export default async function AdminBankAccountsPage() {
  await requireRole("ADMIN", "STAFF");

  const accounts = await prisma.bankAccount.findMany({ orderBy: { displayOrder: "asc" } });
  const rows: BankAccountData[] = JSON.parse(JSON.stringify(accounts));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
      <p className="text-sm text-gray-500">
        These accounts are shown to customers who pay via Bank Transfer. Deactivating an account hides it from
        checkout without deleting its history.
      </p>
      <BankAccountList accounts={rows} />
    </div>
  );
}
