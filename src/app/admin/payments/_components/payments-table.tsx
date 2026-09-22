"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PaymentStatusBadge, VerificationStatusBadge } from "../../_components/badges";

const REFUNDABLE_METHOD_CODES = new Set(["BKASH", "SSLCOMMERZ"]);

export interface PaymentRowData {
  id: string;
  amount: string;
  currency: string;
  status: string;
  verificationStatus: string;
  merchantTransactionId: string;
  providerTransactionId: string | null;
  createdAt: string;
  order: { orderNumber: string; customerName: string; customerPhone: string };
  paymentMethod: { code: string; displayName: string };
  bankAccount: { bankName: string; accountNumber: string } | null;
  verifications: {
    id: string;
    status: string;
    transactionId: string | null;
    senderNumber: string | null;
    receiptUrl: string | null;
    note: string | null;
  }[];
}

function formatMoney(amount: string) {
  const n = Number(amount);
  return `Tk ${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentsTable({ items }: { items: PaymentRowData[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-gray-500">No payments found.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((payment) => (
        <PaymentRow key={payment.id} payment={payment} />
      ))}
    </div>
  );
}

function PaymentRow({ payment }: { payment: PaymentRowData }) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState(payment.amount);
  const [refundReason, setRefundReason] = useState("");
  const [loading, setLoading] = useState(false);

  const latestVerification = payment.verifications[0];
  const canReview = payment.verificationStatus === "PENDING_REVIEW" && Boolean(latestVerification);
  const isRefundable = payment.status === "SUCCESS" && REFUNDABLE_METHOD_CODES.has(payment.paymentMethod.code);

  async function verify(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !rejectionReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: action === "REJECT" ? rejectionReason : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update verification");
      toast.success(action === "APPROVE" ? "Payment verified" : "Payment rejected");
      setShowReject(false);
      setRejectionReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update verification");
    } finally {
      setLoading(false);
    }
  }

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(refundAmount);
    if (!(amountNum > 0)) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (refundReason.trim().length < 3) {
      toast.error("Enter a refund reason");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to process refund");
      toast.success("Refund initiated");
      setShowRefund(false);
      setRefundReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">
            {payment.order.orderNumber} — {payment.order.customerName}
          </p>
          <p className="text-xs text-gray-500">{payment.order.customerPhone}</p>
          <p className="mt-1 text-sm text-gray-700">{payment.paymentMethod.displayName}</p>
          {payment.bankAccount && (
            <p className="text-xs text-gray-500">
              {payment.bankAccount.bankName} — {payment.bankAccount.accountNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatMoney(payment.amount)}</p>
          <div className="mt-1 flex gap-2">
            <PaymentStatusBadge status={payment.status} />
            <VerificationStatusBadge status={payment.verificationStatus} />
          </div>
        </div>
      </div>

      {latestVerification && (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 rounded-md bg-gray-50 p-3 text-xs sm:grid-cols-2">
          {latestVerification.transactionId && (
            <div>
              <dt className="text-gray-500">Transaction ID</dt>
              <dd className="font-medium text-gray-900">{latestVerification.transactionId}</dd>
            </div>
          )}
          {latestVerification.senderNumber && (
            <div>
              <dt className="text-gray-500">Sender Number</dt>
              <dd className="font-medium text-gray-900">{latestVerification.senderNumber}</dd>
            </div>
          )}
          {latestVerification.note && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Note</dt>
              <dd className="text-gray-900">{latestVerification.note}</dd>
            </div>
          )}
          {latestVerification.receiptUrl && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Receipt</dt>
              <dd>
                <a
                  href={latestVerification.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-700 hover:underline"
                >
                  View receipt →
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canReview && !showReject && (
          <>
            <button className="btn-primary" disabled={loading} onClick={() => verify("APPROVE")}>
              Approve
            </button>
            <button className="btn-danger" disabled={loading} onClick={() => setShowReject(true)}>
              Reject
            </button>
          </>
        )}
        {isRefundable && !showRefund && (
          <button className="btn-secondary" disabled={loading} onClick={() => setShowRefund(true)}>
            Refund
          </button>
        )}
        {payment.status === "SUCCESS" && !isRefundable && (
          <span className="text-xs text-gray-400">Refund not supported for {payment.paymentMethod.displayName}</span>
        )}
      </div>

      {canReview && showReject && (
        <div className="mt-3 space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
          <label className="label" htmlFor={`reject-reason-${payment.id}`}>
            Rejection reason (required)
          </label>
          <textarea
            id={`reject-reason-${payment.id}`}
            className="input"
            rows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            maxLength={300}
          />
          <div className="flex gap-2">
            <button className="btn-danger" disabled={loading} onClick={() => verify("REJECT")}>
              Confirm Reject
            </button>
            <button className="btn-secondary" disabled={loading} onClick={() => setShowReject(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isRefundable && showRefund && (
        <form onSubmit={submitRefund} className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <div>
            <label className="label" htmlFor={`refund-amount-${payment.id}`}>
              Refund amount (Tk)
            </label>
            <input
              id={`refund-amount-${payment.id}`}
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor={`refund-reason-${payment.id}`}>
              Reason
            </label>
            <textarea
              id={`refund-reason-${payment.id}`}
              className="input"
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processing..." : "Submit Refund"}
            </button>
            <button type="button" className="btn-secondary" disabled={loading} onClick={() => setShowRefund(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
