"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActiveBadge } from "../../_components/badges";
import { DeliveryZoneForm, type DeliveryZoneData } from "./delivery-zone-form";

function formatMoney(amount: string) {
  return `Tk ${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DeliveryZoneList({ zones }: { zones: DeliveryZoneData[] }) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function deactivate(id: string) {
    setDeactivatingId(id);
    try {
      const res = await fetch(`/api/admin/delivery-zones/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to deactivate zone");
      toast.success("Delivery zone deactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate zone");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        {addingNew ? (
          <DeliveryZoneForm onDone={() => setAddingNew(false)} />
        ) : (
          <button className="btn-primary" onClick={() => setAddingNew(true)}>
            + Add delivery zone
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Base Fee</th>
                <th className="px-4 py-3">Per Kg</th>
                <th className="px-4 py-3">Free Ship Over</th>
                <th className="px-4 py-3">COD Surcharge</th>
                <th className="px-4 py-3">ETA (days)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {zones.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    No delivery zones configured yet.
                  </td>
                </tr>
              )}
              {zones.map((zone) => (
                <Fragment key={zone.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{zone.name}</td>
                    <td className="px-4 py-3 text-gray-500">{zone.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{formatMoney(zone.baseFee)}</td>
                    <td className="px-4 py-3">{formatMoney(zone.perKgFee)}</td>
                    <td className="px-4 py-3">
                      {zone.freeShippingThreshold ? formatMoney(zone.freeShippingThreshold) : "—"}
                    </td>
                    <td className="px-4 py-3">{Number(zone.codSurchargePercent)}%</td>
                    <td className="px-4 py-3">
                      {zone.estimatedDaysMin}–{zone.estimatedDaysMax}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={zone.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => setEditingId(editingId === zone.id ? null : zone.id)}
                        >
                          {editingId === zone.id ? "Close" : "Edit"}
                        </button>
                        {zone.isActive && (
                          <button
                            className="btn-danger"
                            disabled={deactivatingId === zone.id}
                            onClick={() => deactivate(zone.id)}
                          >
                            {deactivatingId === zone.id ? "..." : "Deactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === zone.id && (
                    <tr>
                      <td colSpan={9} className="bg-gray-50 px-4 py-4">
                        <DeliveryZoneForm zone={zone} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
