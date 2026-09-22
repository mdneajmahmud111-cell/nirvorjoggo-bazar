"use client";

import { useRouter } from "next/navigation";

const STATUSES = ["", "PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];
const VERIFICATION_STATUSES = ["", "NOT_REQUIRED", "PENDING_REVIEW", "VERIFIED", "REJECTED"];

export function PaymentsFilter({ status, verificationStatus }: { status: string; verificationStatus: string }) {
  const router = useRouter();

  function applyFilters(next: { status?: string; verificationStatus?: string }) {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextVerification = next.verificationStatus ?? verificationStatus;
    if (nextStatus) params.set("status", nextStatus);
    if (nextVerification) params.set("verificationStatus", nextVerification);
    router.push(`/admin/payments?${params.toString()}`);
  }

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div>
        <label className="label" htmlFor="payment-status">
          Payment Status
        </label>
        <select
          id="payment-status"
          className="input"
          value={status}
          onChange={(e) => applyFilters({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="verification-status">
          Verification Status
        </label>
        <select
          id="verification-status"
          className="input"
          value={verificationStatus}
          onChange={(e) => applyFilters({ verificationStatus: e.target.value })}
        >
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All verification statuses"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
