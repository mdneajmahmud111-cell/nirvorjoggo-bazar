"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { bdPhoneSchema } from "@/lib/validation/auth";
import { PAYMENT_STATUS_COLORS } from "@/lib/format";

interface PaymentInfo {
  id: string;
  status: string;
  verificationStatus: string;
  amount: string | number;
  method: string;
  rejectionReason?: string | null;
}

const manualSubmitSchema = z.object({
  transactionId: z.string().trim().min(3, "Enter the transaction ID").max(60),
  senderNumber: z.union([bdPhoneSchema, z.literal("")]).optional(),
  note: z.string().trim().max(300).optional(),
});
type ManualSubmitInput = z.infer<typeof manualSubmitSchema>;

export function PaymentStatusPanel({
  paymentId,
  initialPayment,
  needsManualSubmission,
  initialShowForm,
}: {
  paymentId: string;
  initialPayment: PaymentInfo;
  needsManualSubmission: boolean;
  initialShowForm: boolean;
}) {
  const [payment, setPayment] = useState<PaymentInfo>(initialPayment);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showForm =
    needsManualSubmission &&
    payment.status !== "SUCCESS" &&
    !justSubmitted &&
    (initialShowForm || payment.verificationStatus === "REJECTED");

  const form = useForm<ManualSubmitInput>({
    resolver: zodResolver(manualSubmitSchema),
    defaultValues: { transactionId: "", senderNumber: "", note: "" },
  });

  useEffect(() => {
    function poll() {
      fetch(`/api/payments/${paymentId}`)
        .then((res) => res.json())
        .then((data: { payment: PaymentInfo }) => {
          setPayment(data.payment);
          if (data.payment.status !== "PENDING" && data.payment.status !== "PROCESSING") {
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        })
        .catch(() => {});
    }

    if (payment.status === "PENDING" || payment.status === "PROCESSING") {
      intervalRef.current = setInterval(poll, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  async function onSubmit(values: ManualSubmitInput) {
    setUploading(true);
    try {
      let receiptUrl: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subdir", "receipts");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          toast.error(uploadData.error ?? "Could not upload receipt");
          return;
        }
        receiptUrl = uploadData.url;
      }

      const res = await fetch("/api/payments/manual-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          transactionId: values.transactionId,
          senderNumber: values.senderNumber || undefined,
          receiptUrl,
          note: values.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit payment details");
        return;
      }
      toast.success("Payment details submitted for review");
      setJustSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const statusColor = PAYMENT_STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-800";

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Payment Status</h2>
        <span className={`badge ${statusColor}`}>{payment.status}</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">Method: {payment.method}</p>
      {payment.rejectionReason && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
          Verification rejected: {payment.rejectionReason}. Please submit your payment details again.
        </p>
      )}

      {showForm && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-700">
            Please submit your transaction ID so we can verify your payment.
          </p>
          <div>
            <label className="label" htmlFor="transactionId">
              Transaction ID
            </label>
            <input id="transactionId" className="input" {...form.register("transactionId")} />
            {form.formState.errors.transactionId && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.transactionId.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="senderNumber">
              Sender number (optional)
            </label>
            <input id="senderNumber" className="input" placeholder="01XXXXXXXXX" {...form.register("senderNumber")} />
            {form.formState.errors.senderNumber && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.senderNumber.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="receipt">
              Payment receipt (optional)
            </label>
            <input
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="label" htmlFor="note">
              Note (optional)
            </label>
            <textarea id="note" rows={2} className="input" {...form.register("note")} />
          </div>
          <button type="submit" className="btn-primary" disabled={uploading}>
            {uploading ? "Submitting…" : "Submit Payment Details"}
          </button>
        </form>
      )}

      {needsManualSubmission && !showForm && payment.status !== "SUCCESS" && payment.verificationStatus === "PENDING_REVIEW" && (
        <p className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Your payment details have been submitted and are pending review by our team.
        </p>
      )}
    </section>
  );
}
