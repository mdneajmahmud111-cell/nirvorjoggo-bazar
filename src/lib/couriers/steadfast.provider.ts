import { env } from "@/lib/env";
import type { CourierAdapter, ShipmentBookingContext, ShipmentBookingResult, ShipmentStatusResult } from "@/lib/couriers/types";
import { CourierProviderError } from "@/lib/couriers/types";
import type { ShipmentStatus } from "@prisma/client";

/**
 * Steadfast Courier API integration.
 * Official spec: https://docs.steadfast.com.bd/
 */

interface CreateOrderResponse {
  status: number;
  message?: string;
  consignment?: {
    consignment_id: number;
    invoice: string;
    tracking_code: string;
    status: string;
  };
}

interface StatusResponse {
  status: number;
  delivery_status?: string;
}

function headers() {
  return {
    "Api-Key": env.steadfast.apiKey(),
    "Secret-Key": env.steadfast.secretKey(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function mapStatus(steadfastStatus: string | undefined): ShipmentStatus {
  switch (steadfastStatus) {
    case "delivered":
      return "DELIVERED";
    case "partial_delivered":
      return "DELIVERED";
    case "cancelled":
      return "CANCELLED";
    case "in_review":
    case "pending":
      return "PENDING";
    case "hold":
      return "BOOKED";
    case "returned":
      return "RETURNED";
    case "delivered_approval_pending":
    case "in_transit":
      return "IN_TRANSIT";
    default:
      return "BOOKED";
  }
}

export const SteadfastProvider: CourierAdapter = {
  code: "STEADFAST",

  async bookShipment(ctx: ShipmentBookingContext): Promise<ShipmentBookingResult> {
    const body = {
      invoice: ctx.order.orderNumber,
      recipient_name: ctx.order.shippingRecipient,
      recipient_phone: ctx.order.shippingPhone,
      recipient_address: `${ctx.order.shippingAddressLine}, ${ctx.order.shippingArea}, ${ctx.order.shippingDistrict}, ${ctx.order.shippingDivision}`,
      cod_amount: ctx.codAmount,
      note: ctx.order.customerNote ?? "",
      item_description: ctx.order.items.map((i) => i.nameSnapshot).join(", "),
    };

    const res = await fetch(`${env.steadfast.baseUrl()}/create_order`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => ({}))) as CreateOrderResponse;

    if (!res.ok || json.status !== 200 || !json.consignment) {
      throw new CourierProviderError(`Steadfast order creation failed: ${json.message ?? res.statusText}`, json);
    }

    return {
      consignmentId: String(json.consignment.consignment_id),
      trackingCode: json.consignment.tracking_code,
      status: mapStatus(json.consignment.status),
      trackingUrl: `https://steadfast.com.bd/t/${json.consignment.tracking_code}`,
      rawResponse: json,
    };
  },

  async getStatus(consignmentId: string): Promise<ShipmentStatusResult> {
    const res = await fetch(`${env.steadfast.baseUrl()}/status_by_cid/${consignmentId}`, {
      method: "GET",
      headers: headers(),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as StatusResponse;
    if (!res.ok) {
      throw new CourierProviderError(`Steadfast status lookup failed for ${consignmentId}`, json);
    }
    return { status: mapStatus(json.delivery_status), rawResponse: json };
  },

  mapWebhookStatus(payload: Record<string, unknown>): ShipmentStatus {
    return mapStatus(String(payload.delivery_status ?? payload.status ?? ""));
  },
};
