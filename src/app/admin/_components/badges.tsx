import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/lib/format";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={`badge ${className ?? "bg-gray-100 text-gray-800"}`}>{children}</span>;
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge className={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge className={PAYMENT_STATUS_COLORS[status]}>{status.replace(/_/g, " ")}</Badge>;
}

const VERIFICATION_COLORS: Record<string, string> = {
  NOT_REQUIRED: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  VERIFIED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function VerificationStatusBadge({ status }: { status: string }) {
  return <Badge className={VERIFICATION_COLORS[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

const SHIPMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  BOOKED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-indigo-100 text-indigo-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function ShipmentStatusBadge({ status }: { status: string }) {
  return <Badge className={SHIPMENT_COLORS[status] ?? "bg-gray-100 text-gray-800"}>{status.replace(/_/g, " ")}</Badge>;
}

const REFUND_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function RefundStatusBadge({ status }: { status: string }) {
  return <Badge className={REFUND_COLORS[status] ?? "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
