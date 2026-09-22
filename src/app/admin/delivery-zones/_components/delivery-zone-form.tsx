"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { deliveryZoneSchema } from "@/lib/validation/admin";
import type { z } from "zod";

type FormValues = z.infer<typeof deliveryZoneSchema>;

export interface DeliveryZoneData {
  id: string;
  name: string;
  type: "INSIDE_DHAKA" | "SUB_DHAKA" | "OUTSIDE_DHAKA";
  baseFee: string;
  perKgFee: string;
  freeShippingThreshold: string | null;
  codSurchargePercent: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

const emptyDefaults: FormValues = {
  name: "",
  type: "INSIDE_DHAKA",
  baseFee: 0,
  perKgFee: 0,
  freeShippingThreshold: null,
  codSurchargePercent: 0,
  estimatedDaysMin: 1,
  estimatedDaysMax: 3,
  isActive: true,
};

export function DeliveryZoneForm({ zone, onDone }: { zone?: DeliveryZoneData; onDone?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(deliveryZoneSchema),
    defaultValues: zone
      ? {
          name: zone.name,
          type: zone.type,
          baseFee: Number(zone.baseFee),
          perKgFee: Number(zone.perKgFee),
          freeShippingThreshold: zone.freeShippingThreshold !== null ? Number(zone.freeShippingThreshold) : null,
          codSurchargePercent: Number(zone.codSurchargePercent),
          estimatedDaysMin: zone.estimatedDaysMin,
          estimatedDaysMax: zone.estimatedDaysMax,
          isActive: zone.isActive,
        }
      : emptyDefaults,
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch(zone ? `/api/admin/delivery-zones/${zone.id}` : "/api/admin/delivery-zones", {
        method: zone ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save delivery zone");
      toast.success(zone ? "Delivery zone updated" : "Delivery zone created");
      router.refresh();
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save delivery zone");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Name</label>
          <input className="input" {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" {...register("type")}>
            <option value="INSIDE_DHAKA">Inside Dhaka</option>
            <option value="SUB_DHAKA">Sub Dhaka</option>
            <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="zone-active" type="checkbox" {...register("isActive")} />
          <label htmlFor="zone-active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
        <div>
          <label className="label">Base fee (Tk)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            {...register("baseFee", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
          {errors.baseFee && <p className="mt-1 text-xs text-red-600">{errors.baseFee.message}</p>}
        </div>
        <div>
          <label className="label">Per-kg fee (Tk)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            {...register("perKgFee", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
        <div>
          <label className="label">Free shipping threshold (Tk)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            {...register("freeShippingThreshold", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
          />
        </div>
        <div>
          <label className="label">COD surcharge (%)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            {...register("codSurchargePercent", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
        <div>
          <label className="label">Estimated days (min)</label>
          <input
            type="number"
            className="input"
            {...register("estimatedDaysMin", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
        <div>
          <label className="label">Estimated days (max)</label>
          <input
            type="number"
            className="input"
            {...register("estimatedDaysMax", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving..." : zone ? "Save changes" : "Create zone"}
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
