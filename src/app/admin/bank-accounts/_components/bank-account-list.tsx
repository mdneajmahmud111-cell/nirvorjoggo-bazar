"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActiveBadge } from "../../_components/badges";
import { BankAccountForm, type BankAccountData } from "./bank-account-form";

export function BankAccountList({ accounts }: { accounts: BankAccountData[] }) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function deactivate(id: string) {
    setDeactivatingId(id);
    try {
      const res = await fetch(`/api/admin/bank-accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to deactivate bank account");
      toast.success("Bank account deactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate bank account");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        {addingNew ? (
          <BankAccountForm onDone={() => setAddingNew(false)} />
        ) : (
          <button className="btn-primary" onClick={() => setAddingNew(true)}>
            + Add bank account
          </button>
        )}
      </div>

      {accounts.length === 0 && <p className="text-sm text-gray-500">No bank accounts configured yet.</p>}

      {accounts.map((account) => (
        <div key={account.id} className="card p-4">
          {editingId === account.id ? (
            <BankAccountForm account={account} onDone={() => setEditingId(null)} />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {account.bankName} — {account.accountName}
                  </p>
                  <p className="text-sm text-gray-600">
                    A/C {account.accountNumber} · {account.branch} · {account.accountType}
                  </p>
                  {account.routingNumber && <p className="text-xs text-gray-500">Routing: {account.routingNumber}</p>}
                  {account.instructions && <p className="mt-1 text-xs text-gray-500">{account.instructions}</p>}
                </div>
                <ActiveBadge isActive={account.isActive} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => setEditingId(account.id)}>
                  Edit
                </button>
                {account.isActive && (
                  <button
                    className="btn-danger"
                    disabled={deactivatingId === account.id}
                    onClick={() => deactivate(account.id)}
                  >
                    {deactivatingId === account.id ? "Deactivating..." : "Deactivate"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
