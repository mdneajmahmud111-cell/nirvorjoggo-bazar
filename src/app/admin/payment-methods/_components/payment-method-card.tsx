"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { paymentMethodUpdateSchema } from "@/lib/validation/admin";
import type { z } from "zod";
import { ActiveBadge } from "../../_components/badges";

type FormValues = z.infer<typeof paymentMethodUpdateSchema>;

export interface PaymentMethodData {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  instructions: string | null;
  isActive: boolean;
  displayOrder: number;
  minAmount: string | null;
  maxAmount: string | null;
  feeFixed: string;
  feePercent: string;
  merchantNumber: string | null;
}

const ENV_VARS_BY_CODE: Record<string, string[]> = {
  BKASH: ["BKASH_BASE_URL", "BKASH_USERNAME", "BKASH_PASSWORD", "BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_CALLBACK_URL"],
  NAGAD: [
    "NAGAD_BASE_URL",
    "NAGAD_MERCHANT_ID",
    "NAGAD_MERCHANT_NUMBER",
    "NAGAD_MERCHANT_PRIVATE_KEY",
    "NAGAD_PUBLIC_KEY",
    "NAGAD_CALLBACK_URL",
  ],
  ROCKET: ["ROCKET_MERCHANT_NUMBER", "ROCKET_MERCHANT_ACCOUNT_TYPE", "ROCKET_VERIFICATION_API_URL", "ROCKET_VERIFICATION_API_KEY"],
  SSLCOMMERZ: [
    "SSLCOMMERZ_STORE_ID",
    "SSLCOMMERZ_STORE_PASSWORD",
    "SSLCOMMERZ_IS_LIVE",
    "SSLCOMMERZ_SUCCESS_URL",
    "SSLCOMMERZ_FAIL_URL",
    "SSLCOMMERZ_CANCEL_URL",
    "SSLCOMMERZ_IPN_URL",
  ],
  BANK_TRANSFER: [],
  COD: [],
};

export function PaymentMethodCard({ method }: { method: PaymentMethodData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const envVars = ENV_VARS_BY_CODE[method.code] ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(paymentMethodUpdateSchema),
    defaultValues: {
      displayName: method.displayName,
      description: method.description,
      instructions: method.instructions,
      isActive: method.isActive,
      displayOrder: method.displayOrder,
      minAmount: method.minAmount !== null ? Number(method.minAmount) : null,
      maxAmount: method.maxAmount !== null ? Number(method.maxAmount) : null,
      feeFixed: Number(method.feeFixed),
      feePercent: Number(method.feePercent),
      merchantNumber: method.merchantNumber,
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-methods/${method.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update payment method");
      toast.success(`${method.displayName} updated`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payment method");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {method.displayName} <span className="text-xs font-normal text-gray-400">({method.code})</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActiveBadge isActive={method.isActive} />
          <button type="button" className="btn-secondary" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <input id={`active-${method.id}`} type="checkbox" {...register("isActive")} />
            <label htmlFor={`active-${method.id}`} className="text-sm font-medium text-gray-700">
              Active (visible to customers at checkout)
            </label>
          </div>

          <div>
            <label className="label" htmlFor={`displayName-${method.id}`}>
              Display name
            </label>
            <input id={`displayName-${method.id}`} className="input" {...register("displayName")} />
            {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor={`description-${method.id}`}>
              Description
            </label>
            <textarea
              id={`description-${method.id}`}
              className="input"
              rows={2}
              {...register("description", { setValueAs: (v) => (v === "" ? null : v) })}
            />
          </div>

          <div>
            <label className="label" htmlFor={`instructions-${method.id}`}>
              Instructions shown to customers
            </label>
            <textarea
              id={`instructions-${method.id}`}
              className="input"
              rows={3}
              {...register("instructions", { setValueAs: (v) => (v === "" ? null : v) })}
            />
          </div>

          <div>
            <label className="label" htmlFor={`merchantNumber-${method.id}`}>
              Merchant number
            </label>
            <input
              id={`merchantNumber-${method.id}`}
              className="input"
              {...register("merchantNumber", { setValueAs: (v) => (v === "" ? null : v) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor={`minAmount-${method.id}`}>
                Min amount (Tk)
              </label>
              <input
                id={`minAmount-${method.id}`}
                type="number"
                step="0.01"
                className="input"
                {...register("minAmount", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`maxAmount-${method.id}`}>
                Max amount (Tk)
              </label>
              <input
                id={`maxAmount-${method.id}`}
                type="number"
                step="0.01"
                className="input"
                {...register("maxAmount", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`feeFixed-${method.id}`}>
                Fixed fee (Tk)
              </label>
              <input
                id={`feeFixed-${method.id}`}
                type="number"
                step="0.01"
                className="input"
                {...register("feeFixed", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`feePercent-${method.id}`}>
                Fee percent (%)
              </label>
              <input
                id={`feePercent-${method.id}`}
                type="number"
                step="0.01"
                className="input"
                {...register("feePercent", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`displayOrder-${method.id}`}>
                Display order
              </label>
              <input
                id={`displayOrder-${method.id}`}
                type="number"
                className="input"
                {...register("displayOrder", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {envVars.length > 0 && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-500">
          <p className="font-medium text-gray-700">Provider secrets are configured via environment variables only:</p>
          <p className="mt-1 font-mono">{envVars.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
