"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { formatBDT } from "@/lib/format";
import { bdPhoneSchema } from "@/lib/validation/auth";
import type { PaymentMethodCode } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CartItemDto {
  id: string;
  quantity: number;
  productId: string;
  variantId: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string | number;
    weightKg: string | number;
    images: { url: string; altText?: string | null }[];
  };
  variant: { id: string; name: string; price: string | number } | null;
}

interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  postalCode?: string | null;
  isDefault: boolean;
}

interface LocationRow {
  division: string;
  district: string;
  area: string;
}

interface PaymentMethodDto {
  id: string;
  code: PaymentMethodCode;
  displayName: string;
  description?: string | null;
  instructions?: string | null;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  feeFixed: string | number;
  feePercent: string | number;
  merchantNumber?: string | null;
}

interface BankAccountDto {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routingNumber?: string | null;
  instructions?: string | null;
}

interface ShippingEstimate {
  fee: number;
  zoneName: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isFreeShipping: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const customerInfoSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your full name").max(100),
  customerPhone: bdPhoneSchema,
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
});
type CustomerInfoInput = z.infer<typeof customerInfoSchema>;

const newAddressSchema = z.object({
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(100),
  phone: bdPhoneSchema,
  division: z.string().trim().min(1, "Select a division"),
  district: z.string().trim().min(1, "Select a district"),
  area: z.string().trim().min(1, "Select an area"),
  addressLine: z.string().trim().min(5, "Enter a complete address").max(300),
  postalCode: z.string().trim().max(20).optional(),
  saveAddress: z.boolean().optional(),
});
type NewAddressInput = z.infer<typeof newAddressSchema>;

export function CheckoutClient({ paymentError }: { paymentError?: string }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [cartItems, setCartItems] = useState<CartItemDto[] | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  const [cartLoaded, setCartLoaded] = useState(false);

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [methods, setMethods] = useState<PaymentMethodDto[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [paymentMethodCode, setPaymentMethodCode] = useState<PaymentMethodCode | "">("");
  const [bankAccountId, setBankAccountId] = useState<string>("");

  const [customerNote, setCustomerNote] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [shippingErrorMsg, setShippingErrorMsg] = useState<string | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const customerForm = useForm<CustomerInfoInput>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: { customerName: "", customerPhone: "", customerEmail: "" },
  });

  const addressForm = useForm<NewAddressInput>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: {
      recipientName: "",
      phone: "",
      division: "",
      district: "",
      area: "",
      addressLine: "",
      postalCode: "",
      saveAddress: true,
    },
  });

  // Prefill customer info from the logged-in session, but leave every field editable.
  useEffect(() => {
    if (session?.user) {
      customerForm.reset({
        customerName: session.user.name ?? "",
        customerPhone: session.user.phone ?? "",
        customerEmail: session.user.email ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // Load cart
  useEffect(() => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => {
        setCartItems(data.cart.items);
        setSubtotal(data.totals.subtotal);
        setCartLoaded(true);
      })
      .catch(() => setCartLoaded(true));
  }, []);

  // Load addresses (logged-in only)
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/addresses")
      .then((res) => res.json())
      .then((data: { addresses: AddressDto[] }) => {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setAddressMode("saved");
          const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
          setSelectedAddressId(def.id);
        }
      })
      .catch(() => {});
  }, [sessionStatus]);

  // Load locations, payment methods, bank accounts
  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => setLocations(data.locations))
      .catch(() => {});
    fetch("/api/payment-methods")
      .then((res) => res.json())
      .then((data: { methods: PaymentMethodDto[] }) => {
        setMethods(data.methods);
        if (data.methods.length > 0) setPaymentMethodCode(data.methods[0].code);
      })
      .catch(() => {});
    fetch("/api/bank-accounts")
      .then((res) => res.json())
      .then((data: { accounts: BankAccountDto[] }) => setBankAccounts(data.accounts))
      .catch(() => {});
  }, []);

  const divisions = useMemo(() => Array.from(new Set(locations.map((l) => l.division))).sort(), [locations]);
  const watchedDivision = addressForm.watch("division");
  const watchedDistrict = addressForm.watch("district");
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

  const cartWeightKg = useMemo(
    () => (cartItems ?? []).reduce((sum, item) => sum + Number(item.product.weightKg) * item.quantity, 0),
    [cartItems],
  );

  const activeAddress = useMemo(() => {
    if (addressMode === "saved") {
      const found = addresses.find((a) => a.id === selectedAddressId);
      return found ? { division: found.division, district: found.district, area: found.area } : null;
    }
    const { division, district, area } = addressForm.watch();
    return division && district && area ? { division, district, area } : null;
  }, [addressMode, addresses, selectedAddressId, addressForm]);

  // Recalculate shipping whenever the address or cart changes.
  const recalcShipping = useCallback(async () => {
    if (!activeAddress || !cartLoaded || !cartItems || cartItems.length === 0) {
      setShippingEstimate(null);
      setShippingErrorMsg(null);
      return;
    }
    setCalculatingShipping(true);
    setShippingErrorMsg(null);
    try {
      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activeAddress, cartWeightKg, cartSubtotal: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShippingEstimate(null);
        setShippingErrorMsg(data.error ?? "This address is not currently deliverable.");
        return;
      }
      setShippingEstimate(data.estimate);
    } catch {
      setShippingEstimate(null);
      setShippingErrorMsg("Could not calculate shipping. Please try again.");
    } finally {
      setCalculatingShipping(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress?.division, activeAddress?.district, activeAddress?.area, cartWeightKg, subtotal, cartLoaded]);

  useEffect(() => {
    recalcShipping();
  }, [recalcShipping]);

  const total = subtotal + (shippingEstimate?.fee ?? 0);
  const selectedMethod = methods.find((m) => m.code === paymentMethodCode);

  function methodFeeLabel(m: PaymentMethodDto) {
    const fixed = Number(m.feeFixed);
    const percent = Number(m.feePercent);
    if (fixed <= 0 && percent <= 0) return null;
    const parts: string[] = [];
    if (fixed > 0) parts.push(formatBDT(fixed));
    if (percent > 0) parts.push(`${percent}%`);
    return `+ ${parts.join(" + ")} fee`;
  }

  const canSubmit =
    cartLoaded &&
    (cartItems?.length ?? 0) > 0 &&
    !!activeAddress &&
    !!shippingEstimate &&
    !shippingErrorMsg &&
    !!paymentMethodCode &&
    (paymentMethodCode !== "BANK_TRANSFER" || !!bankAccountId) &&
    !submitting;

  async function handlePlaceOrder() {
    const customerValid = await customerForm.trigger();
    if (!customerValid) {
      toast.error("Please fix the errors in your contact information.");
      return;
    }

    let newAddressPayload: (NewAddressInput & { saveAddress?: boolean }) | undefined;
    if (addressMode === "new") {
      const addressValid = await addressForm.trigger();
      if (!addressValid) {
        toast.error("Please fix the errors in your delivery address.");
        return;
      }
      newAddressPayload = addressForm.getValues();
    } else if (!selectedAddressId) {
      toast.error("Please select a delivery address.");
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!paymentMethodCode) {
      toast.error("Please select a payment method.");
      return;
    }
    if (paymentMethodCode === "BANK_TRANSFER" && !bankAccountId) {
      toast.error("Please select a bank account to transfer to.");
      return;
    }
    if (!shippingEstimate) {
      toast.error("Please wait for the shipping fee to be calculated.");
      return;
    }

    const customerValues = customerForm.getValues();
    const body = {
      customerName: customerValues.customerName,
      customerPhone: customerValues.customerPhone,
      customerEmail: customerValues.customerEmail || undefined,
      addressId: addressMode === "saved" ? selectedAddressId : undefined,
      newAddress: newAddressPayload,
      items: cartItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
      })),
      paymentMethodCode,
      bankAccountId: paymentMethodCode === "BANK_TRANSFER" ? bankAccountId : undefined,
      customerNote: customerNote || undefined,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not place order. Please try again.");
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.requiresManualVerification) {
        router.push(`/order/success/${data.order.id}?paymentId=${data.payment.id}`);
        return;
      }
      router.push(`/order/success/${data.order.id}`);
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cartLoaded && (!cartItems || cartItems.length === 0)) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-gray-500">Add products to your cart before checking out.</p>
        <a href="/shop" className="btn-primary mt-6 inline-flex">
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      {paymentError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {decodeURIComponent(paymentError)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer info */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customerName">
                  Full name
                </label>
                <input id="customerName" className="input" {...customerForm.register("customerName")} />
                {customerForm.formState.errors.customerName && (
                  <p className="mt-1 text-xs text-red-600">{customerForm.formState.errors.customerName.message}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="customerPhone">
                  Phone number
                </label>
                <input
                  id="customerPhone"
                  className="input"
                  placeholder="01XXXXXXXXX"
                  {...customerForm.register("customerPhone")}
                />
                {customerForm.formState.errors.customerPhone && (
                  <p className="mt-1 text-xs text-red-600">{customerForm.formState.errors.customerPhone.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="customerEmail">
                  Email (optional)
                </label>
                <input id="customerEmail" className="input" {...customerForm.register("customerEmail")} />
                {customerForm.formState.errors.customerEmail && (
                  <p className="mt-1 text-xs text-red-600">{customerForm.formState.errors.customerEmail.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Delivery Address</h2>

            {addresses.length > 0 && (
              <div className="mb-4 space-y-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                      addressMode === "saved" && selectedAddressId === addr.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressChoice"
                      className="mt-1"
                      checked={addressMode === "saved" && selectedAddressId === addr.id}
                      onChange={() => {
                        setAddressMode("saved");
                        setSelectedAddressId(addr.id);
                      }}
                    />
                    <span>
                      <span className="font-medium text-gray-900">{addr.label}</span> — {addr.recipientName} ({addr.phone})
                      <br />
                      <span className="text-gray-600">
                        {addr.addressLine}, {addr.area}, {addr.district}, {addr.division}
                        {addr.postalCode ? ` — ${addr.postalCode}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
                    addressMode === "new" ? "border-brand-500 bg-brand-50" : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={addressMode === "new"}
                    onChange={() => setAddressMode("new")}
                  />
                  <span className="font-medium text-gray-900">Use a new address</span>
                </label>
              </div>
            )}

            {addressMode === "new" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="recipientName">
                    Recipient name
                  </label>
                  <input id="recipientName" className="input" {...addressForm.register("recipientName")} />
                  {addressForm.formState.errors.recipientName && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.recipientName.message}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="addrPhone">
                    Recipient phone
                  </label>
                  <input id="addrPhone" className="input" placeholder="01XXXXXXXXX" {...addressForm.register("phone")} />
                  {addressForm.formState.errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="division">
                    Division
                  </label>
                  <select
                    id="division"
                    className="input"
                    {...addressForm.register("division")}
                    onChange={(e) => {
                      addressForm.setValue("division", e.target.value);
                      addressForm.setValue("district", "");
                      addressForm.setValue("area", "");
                    }}
                  >
                    <option value="">Select division</option>
                    {divisions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {addressForm.formState.errors.division && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.division.message}</p>
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
                    {...addressForm.register("district")}
                    onChange={(e) => {
                      addressForm.setValue("district", e.target.value);
                      addressForm.setValue("area", "");
                    }}
                  >
                    <option value="">Select district</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {addressForm.formState.errors.district && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.district.message}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="area">
                    Area
                  </label>
                  <select id="area" className="input" disabled={!watchedDistrict} {...addressForm.register("area")}>
                    <option value="">Select area</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  {addressForm.formState.errors.area && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.area.message}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="postalCode">
                    Postal code (optional)
                  </label>
                  <input id="postalCode" className="input" {...addressForm.register("postalCode")} />
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="addressLine">
                    Full address
                  </label>
                  <textarea id="addressLine" rows={2} className="input" {...addressForm.register("addressLine")} />
                  {addressForm.formState.errors.addressLine && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.addressLine.message}</p>
                  )}
                </div>

                {sessionStatus === "authenticated" && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                    <input type="checkbox" {...addressForm.register("saveAddress")} />
                    Save this address to my account
                  </label>
                )}
              </div>
            )}

            <div className="mt-4 text-sm">
              {calculatingShipping && <p className="text-gray-500">Calculating shipping fee…</p>}
              {shippingErrorMsg && (
                <p className="rounded-md bg-red-50 p-2 text-red-700">{shippingErrorMsg}</p>
              )}
              {shippingEstimate && !shippingErrorMsg && (
                <p className="rounded-md bg-brand-50 p-2 text-brand-700">
                  Shipping to {shippingEstimate.zoneName}: {formatBDT(shippingEstimate.fee)} · Estimated delivery in{" "}
                  {shippingEstimate.estimatedDaysMin}-{shippingEstimate.estimatedDaysMax} days
                  {shippingEstimate.isFreeShipping ? " · Free shipping applied" : ""}
                </p>
              )}
            </div>
          </section>

          {/* Payment */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Method</h2>
            {methods.length === 0 ? (
              <p className="text-sm text-gray-500">No payment methods are currently available.</p>
            ) : (
              <div className="space-y-2">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className={`block cursor-pointer rounded-md border p-3 text-sm ${
                      paymentMethodCode === m.code ? "border-brand-500 bg-brand-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        className="mt-1"
                        checked={paymentMethodCode === m.code}
                        onChange={() => setPaymentMethodCode(m.code)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{m.displayName}</span>
                          {methodFeeLabel(m) && <span className="text-xs text-gray-500">{methodFeeLabel(m)}</span>}
                        </div>
                        {m.description && <p className="mt-0.5 text-gray-600">{m.description}</p>}
                        {paymentMethodCode === m.code && (
                          <div className="mt-2 space-y-2">
                            {m.instructions && <p className="text-xs text-gray-500">{m.instructions}</p>}
                            {m.code === "ROCKET" && m.merchantNumber && (
                              <p className="rounded bg-white p-2 text-xs text-gray-700">
                                Send payment to Rocket number: <span className="font-semibold">{m.merchantNumber}</span>
                              </p>
                            )}
                            {m.code === "BANK_TRANSFER" && (
                              <div className="space-y-2">
                                {bankAccounts.length === 0 ? (
                                  <p className="text-xs text-gray-500">No bank accounts are currently configured.</p>
                                ) : (
                                  bankAccounts.map((acc) => (
                                    <label
                                      key={acc.id}
                                      className={`flex cursor-pointer items-start gap-2 rounded border p-2 text-xs ${
                                        bankAccountId === acc.id ? "border-brand-500 bg-white" : "border-gray-200 bg-white"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name="bankAccount"
                                        checked={bankAccountId === acc.id}
                                        onChange={() => setBankAccountId(acc.id)}
                                      />
                                      <span>
                                        <span className="font-medium">{acc.bankName}</span> — {acc.accountName} (
                                        {acc.accountNumber}), {acc.branch}
                                        {acc.instructions && <><br />{acc.instructions}</>}
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {paymentMethodCode === "COD" && (
              <p className="mt-3 text-xs text-gray-500">
                A cash-on-delivery handling fee may be added to your total for this zone; the final amount will be
                shown on your order confirmation.
              </p>
            )}
          </section>

          <section className="card p-5">
            <label className="label" htmlFor="customerNote">
              Order note (optional)
            </label>
            <textarea
              id="customerNote"
              rows={3}
              className="input"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Delivery instructions, gift notes, etc."
            />
          </section>
        </div>

        {/* Order summary */}
        <div className="card h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
          <ul className="space-y-2 text-sm">
            {(cartItems ?? []).map((item) => {
              const unitPrice = Number(item.variant?.price ?? item.product.price);
              return (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="text-gray-700">
                    {item.product.name}
                    {item.variant ? ` (${item.variant.name})` : ""} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-medium text-gray-900">{formatBDT(unitPrice * item.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 border-t border-gray-200 pt-3 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Shipping</span>
              <span>{shippingEstimate ? formatBDT(shippingEstimate.fee) : "—"}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatBDT(total)}</span>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" disabled={!canSubmit} onClick={handlePlaceOrder}>
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
