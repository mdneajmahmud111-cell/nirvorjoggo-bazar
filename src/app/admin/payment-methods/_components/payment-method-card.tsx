"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { paymentMethodUpdateSchema } from "@/lib/validation/admin";
import type { z } from "zod";
import { ActiveBadge, ConfiguredBadge } from "../../_components/badges";

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
  mode: "MANUAL" | "AUTOMATIC";
  activation: { ok: boolean; reason?: string };
}

// Only bKash and Nagad have a real Manual/Automatic switch — Rocket and Bank Transfer are
// always manual (no public merchant API exists for them), SSLCommerz is always automatic (no
// personal-account equivalent), and COD needs neither.
const MODE_SWITCHABLE = new Set(["BKASH", "NAGAD"]);

const AUTOMATIC_ENV_VARS_BY_CODE: Record<string, string[]> = {
  BKASH: ["BKASH_BASE_URL", "BKASH_USERNAME", "BKASH_PASSWORD", "BKASH_APP_KEY", "BKASH_APP_SECRET", "BKASH_CALLBACK_URL"],
  NAGAD: [
    "NAGAD_BASE_URL",
    "NAGAD_MERCHANT_ID",
    "NAGAD_MERCHANT_NUMBER",
    "NAGAD_MERCHANT_PRIVATE_KEY",
    "NAGAD_PUBLIC_KEY",
    "NAGAD_CALLBACK_URL",
  ],
  ROCKET: ["ROCKET_MERCHANT_NUMBER (optional deploy-time default — a number set below takes priority)"],
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

// Whether env vars are even relevant to show right now: SSLCommerz always, Rocket always
// (optional fallback), bKash/Nagad only while in Automatic mode.
function envVarsRelevant(method: PaymentMethodData): boolean {
  if (method.code === "SSLCOMMERZ" || method.code === "ROCKET") return true;
  if (MODE_SWITCHABLE.has(method.code)) return method.mode === "AUTOMATIC";
  return false;
}

export function PaymentMethodCard({ method }: { method: PaymentMethodData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"MANUAL" | "AUTOMATIC">(method.mode);
  const envVars = AUTOMATIC_ENV_VARS_BY_CODE[method.code] ?? [];
  const showEnvVars = envVarsRelevant({ ...method, mode });

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
      mode: method.mode,
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
          {MODE_SWITCHABLE.has(method.code) && (
            <span className="badge bg-purple-100 text-purple-800">{method.mode === "MANUAL" ? "Manual" : "Automatic"}</span>
          )}
          {method.code !== "COD" && <ConfiguredBadge isConfigured={method.activation.ok} />}
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
          {!method.activation.ok && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{method.activation.reason}</p>
          )}

          {MODE_SWITCHABLE.has(method.code) && (
            <div>
              <p className="label">Mode</p>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" value="MANUAL" {...register("mode")} onChange={() => setMode("MANUAL")} defaultChecked={method.mode === "MANUAL"} />
                  Manual (personal number, admin verifies)
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    value="AUTOMATIC"
                    {...register("mode")}
                    onChange={() => setMode("AUTOMATIC")}
                    defaultChecked={method.mode === "AUTOMATIC"}
                  />
                  Automatic (merchant API)
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Manual needs only the number below — no API credentials. Switching to Automatic requires the environment
                variables listed at the bottom of this card to already be set on the server.
              </p>
            </div>
          )}

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

          {["BKASH", "NAGAD", "ROCKET"].includes(method.code) && (
            <div>
              <label className="label" htmlFor={`merchantNumber-${method.id}`}>
                Personal / merchant number
              </label>
              <input
                id={`merchantNumber-${method.id}`}
                className="input"
                placeholder="01XXXXXXXXX"
                {...register("merchantNumber", { setValueAs: (v) => (v === "" ? null : v) })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown to customers at checkout to send payment to{MODE_SWITCHABLE.has(method.code) ? " while in Manual mode" : ""}.
              </p>
            </div>
          )}

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

      {showEnvVars && envVars.length > 0 && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-500">
          <p className="font-medium text-gray-700">Provider secrets are configured via environment variables only, never here:</p>
          <p className="mt-1 font-mono">{envVars.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
