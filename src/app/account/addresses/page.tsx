"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addressSchema, type AddressInput } from "@/lib/validation/address";

interface AddressDto extends AddressInput {
  id: string;
}

interface LocationRow {
  division: string;
  district: string;
  area: string;
}

const emptyAddress: AddressInput = {
  label: "Home",
  recipientName: "",
  phone: "",
  division: "",
  district: "",
  area: "",
  addressLine: "",
  postalCode: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddress,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/addresses").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]).then(([addrData, locData]) => {
      setAddresses(addrData.addresses ?? []);
      setLocations(locData.locations ?? []);
      setLoading(false);
    });
  }, []);

  const divisions = useMemo(() => Array.from(new Set(locations.map((l) => l.division))).sort(), [locations]);
  const watchedDivision = form.watch("division");
  const watchedDistrict = form.watch("district");
  const districts = useMemo(
    () => Array.from(new Set(locations.filter((l) => l.division === watchedDivision).map((l) => l.district))).sort(),
    [locations, watchedDivision],
  );
  const areas = useMemo(
    () =>
      Array.from(
        new Set(
          locations.filter((l) => l.division === watchedDivision && l.district === watchedDistrict).map((l) => l.area),
        ),
      ).sort(),
    [locations, watchedDivision, watchedDistrict],
  );

  function openNewForm() {
    setEditingId(null);
    form.reset(emptyAddress);
    setShowForm(true);
  }

  function openEditForm(address: AddressDto) {
    setEditingId(address.id);
    form.reset({
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      division: address.division,
      district: address.district,
      area: address.area,
      addressLine: address.addressLine,
      postalCode: address.postalCode ?? "",
      isDefault: address.isDefault,
    });
    setShowForm(true);
  }

  async function onSubmit(values: AddressInput) {
    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/addresses/${editingId}` : "/api/addresses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save address");
        return;
      }
      const list = await fetch("/api/addresses").then((r) => r.json());
      setAddresses(list.addresses ?? []);
      toast.success(editingId ? "Address updated" : "Address added");
      setShowForm(false);
      setEditingId(null);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Could not delete address");
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address deleted");
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!res.ok) return;
    const list = await fetch("/api/addresses").then((r) => r.json());
    setAddresses(list.addresses ?? []);
  }

  if (loading) {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
        {!showForm && (
          <button type="button" className="btn-primary" onClick={openNewForm}>
            Add New Address
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="card mb-8 space-y-4 p-5">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Address" : "New Address"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="label">
                Label
              </label>
              <input id="label" className="input" placeholder="Home, Office, etc." {...form.register("label")} />
            </div>
            <div>
              <label className="label" htmlFor="recipientName">
                Recipient name
              </label>
              <input id="recipientName" className="input" {...form.register("recipientName")} />
              {form.formState.errors.recipientName && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.recipientName.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Phone number
              </label>
              <input id="phone" className="input" placeholder="01XXXXXXXXX" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="postalCode">
                Postal code (optional)
              </label>
              <input id="postalCode" className="input" {...form.register("postalCode")} />
            </div>

            <div>
              <label className="label" htmlFor="division">
                Division
              </label>
              <select
                id="division"
                className="input"
                {...form.register("division")}
                onChange={(e) => {
                  form.setValue("division", e.target.value);
                  form.setValue("district", "");
                  form.setValue("area", "");
                }}
              >
                <option value="">Select division</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {form.formState.errors.division && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.division.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="district">
                District
              </label>
              <select
                id="district"
                className="input"
                disabled={!watchedDivision}
                {...form.register("district")}
                onChange={(e) => {
                  form.setValue("district", e.target.value);
                  form.setValue("area", "");
                }}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {form.formState.errors.district && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.district.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="area">
                Area
              </label>
              <select id="area" className="input" disabled={!watchedDistrict} {...form.register("area")}>
                <option value="">Select area</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {form.formState.errors.area && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.area.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="addressLine">
                Full address
              </label>
              <textarea id="addressLine" rows={2} className="input" {...form.register("addressLine")} />
              {form.formState.errors.addressLine && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.addressLine.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
              <input type="checkbox" {...form.register("isDefault")} />
              Set as default address
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save Address"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <p className="text-sm text-gray-500">You have no saved addresses yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{address.label}</span>
                {address.isDefault && <span className="badge bg-brand-100 text-brand-700">Default</span>}
              </div>
              <p className="mt-1 text-sm text-gray-700">
                {address.recipientName} — {address.phone}
              </p>
              <p className="text-sm text-gray-600">
                {address.addressLine}, {address.area}, {address.district}, {address.division}
                {address.postalCode ? ` — ${address.postalCode}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <button type="button" className="text-brand-700 hover:underline" onClick={() => openEditForm(address)}>
                  Edit
                </button>
                {!address.isDefault && (
                  <button type="button" className="text-brand-700 hover:underline" onClick={() => setDefault(address.id)}>
                    Set as default
                  </button>
                )}
                <button type="button" className="text-red-600 hover:underline" onClick={() => deleteAddress(address.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
