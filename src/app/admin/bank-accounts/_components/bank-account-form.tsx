"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { bankAccountSchema } from "@/lib/validation/admin";
import type { z } from "zod";

type FormValues = z.infer<typeof bankAccountSchema>;

export interface BankAccountData {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routingNumber: string | null;
  accountType: "SAVINGS" | "CURRENT";
  instructions: string | null;
  isActive: boolean;
  displayOrder: number;
}

const emptyDefaults: FormValues = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  branch: "",
  routingNumber: null,
  accountType: "SAVINGS",
  instructions: null,
  isActive: true,
  displayOrder: 0,
};

export function BankAccountForm({ account, onDone }: { account?: BankAccountData; onDone?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: account
      ? {
          bankName: account.bankName,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          branch: account.branch,
          routingNumber: account.routingNumber,
          accountType: account.accountType,
          instructions: account.instructions,
          isActive: account.isActive,
          displayOrder: account.displayOrder,
        }
      : emptyDefaults,
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch(account ? `/api/admin/bank-accounts/${account.id}` : "/api/admin/bank-accounts", {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save bank account");
      toast.success(account ? "Bank account updated" : "Bank account added");
      router.refresh();
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Bank name</label>
          <input className="input" {...register("bankName")} />
          {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
        </div>
        <div>
          <label className="label">Account name</label>
          <input className="input" {...register("accountName")} />
          {errors.accountName && <p className="mt-1 text-xs text-red-600">{errors.accountName.message}</p>}
        </div>
        <div>
          <label className="label">Account number</label>
          <input className="input" {...register("accountNumber")} />
          {errors.accountNumber && <p className="mt-1 text-xs text-red-600">{errors.accountNumber.message}</p>}
        </div>
        <div>
          <label className="label">Branch</label>
          <input className="input" {...register("branch")} />
          {errors.branch && <p className="mt-1 text-xs text-red-600">{errors.branch.message}</p>}
        </div>
        <div>
          <label className="label">Routing number</label>
          <input className="input" {...register("routingNumber", { setValueAs: (v) => (v === "" ? null : v) })} />
        </div>
        <div>
          <label className="label">Account type</label>
          <select className="input" {...register("accountType")}>
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
          </select>
        </div>
        <div>
          <label className="label">Display order</label>
          <input
            type="number"
            className="input"
            {...register("displayOrder", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="bank-active" type="checkbox" {...register("isActive")} />
          <label htmlFor="bank-active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
      </div>
      <div>
        <label className="label">Instructions for customers</label>
        <textarea
          className="input"
          rows={2}
          {...register("instructions", { setValueAs: (v) => (v === "" ? null : v) })}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving..." : account ? "Save changes" : "Add bank account"}
        </button>
        {onDone && (
          <button type="button" className="btn-secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
