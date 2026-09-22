"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface MasterLocationData {
  id: string;
  division: string;
  district: string;
  area: string;
  deliveryZoneId: string;
  deliveryZone: { id: string; name: string };
}

export interface ZoneOption {
  id: string;
  name: string;
}

export function MasterLocationSection({
  locations,
  zoneOptions,
}: {
  locations: MasterLocationData[];
  zoneOptions: ZoneOption[];
}) {
  const router = useRouter();
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState(zoneOptions[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!division.trim() || !district.trim() || !area.trim() || !deliveryZoneId) {
      toast.error("Fill in division, district, area, and delivery zone");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/master-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, district, area, deliveryZoneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add location mapping");
      toast.success("Location mapping added");
      setDivision("");
      setDistrict("");
      setArea("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add location mapping");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Master Locations</h2>
      <p className="mb-3 text-sm text-gray-500">
        Maps a specific division / district / area to a delivery zone. This drives the cascading location picker at
        customer checkout.
      </p>

      <form onSubmit={submit} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div>
          <label className="label">Division</label>
          <input className="input" value={division} onChange={(e) => setDivision(e.target.value)} />
        </div>
        <div>
          <label className="label">District</label>
          <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </div>
        <div>
          <label className="label">Area</label>
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <label className="label">Delivery zone</label>
          <select className="input" value={deliveryZoneId} onChange={(e) => setDeliveryZoneId(e.target.value)}>
            {zoneOptions.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading || zoneOptions.length === 0}>
          {loading ? "Adding..." : "Add mapping"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Division</th>
              <th className="py-2 pr-4">District</th>
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Delivery Zone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {locations.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  No location mappings yet.
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td className="py-2 pr-4">{loc.division}</td>
                <td className="py-2 pr-4">{loc.district}</td>
                <td className="py-2 pr-4">{loc.area}</td>
                <td className="py-2 pr-4">{loc.deliveryZone.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
