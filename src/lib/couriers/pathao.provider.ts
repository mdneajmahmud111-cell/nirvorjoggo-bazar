import { env } from "@/lib/env";
import type { CourierAdapter, ShipmentBookingContext, ShipmentBookingResult, ShipmentStatusResult } from "@/lib/couriers/types";
import { CourierProviderError } from "@/lib/couriers/types";
import type { ShipmentStatus } from "@prisma/client";

/**
 * Pathao Courier (Hermes) API integration.
 * Official spec: https://merchant.pathao.com/courier/developer
 */

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface CityListResponse {
  data: { data: { city_id: number; city_name: string }[] };
}
interface ZoneListResponse {
  data: { data: { zone_id: number; zone_name: string }[] };
}
interface AreaListResponse {
  data: { data: { area_id: number; area_name: string }[] };
}

interface CreateOrderResponse {
  code: number;
  message?: string;
  type?: string;
  data?: { consignment_id: string; merchant_order_id: string; order_status: string; delivery_fee?: number };
}

interface OrderInfoResponse {
  code: number;
  data?: { order_status: string };
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function pathaoFetch<T>(path: string, options: { method: "GET" | "POST"; body?: unknown; authed?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (options.authed) {
    headers.Authorization = `Bearer ${await getAccessToken()}`;
  }
  const res = await fetch(`${env.pathao.baseUrl()}${path}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new CourierProviderError(`Pathao API error (${res.status}): ${(json as any)?.message ?? res.statusText}`, json);
  }
  return json;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }
  const res = await fetch(`${env.pathao.baseUrl()}/aut/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.pathao.clientId(),
      client_secret: env.pathao.clientSecret(),
      username: env.pathao.username(),
      password: env.pathao.password(),
      grant_type: "password",
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { message?: string };
  if (!res.ok || !json.access_token) {
    throw new CourierProviderError(`Pathao token issue failed: ${json.message ?? res.statusText}`, json);
  }
  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.accessToken;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

async function resolveLocationIds(district: string, area: string): Promise<{ cityId: number; zoneId: number; areaId: number }> {
  const cities = await pathaoFetch<CityListResponse>("/aut/api/v1/city-list", { method: "GET", authed: true });
  const city = cities.data.data.find((c) => normalize(c.city_name) === normalize(district)) ?? cities.data.data[0];
  if (!city) throw new CourierProviderError(`Pathao: no serviceable city found for district "${district}"`);

  const zones = await pathaoFetch<ZoneListResponse>(`/aut/api/v1/cities/${city.city_id}/zone-list`, { method: "GET", authed: true });
  const zone =
    zones.data.data.find((z) => normalize(z.zone_name).includes(normalize(area)) || normalize(area).includes(normalize(z.zone_name))) ??
    zones.data.data[0];
  if (!zone) throw new CourierProviderError(`Pathao: no serviceable zone found in "${district}" for area "${area}"`);

  const areas = await pathaoFetch<AreaListResponse>(`/aut/api/v1/zones/${zone.zone_id}/area-list`, { method: "GET", authed: true });
  const areaMatch = areas.data.data[0];
  if (!areaMatch) throw new CourierProviderError(`Pathao: no serviceable area found in zone "${zone.zone_name}"`);

  return { cityId: city.city_id, zoneId: zone.zone_id, areaId: areaMatch.area_id };
}

function mapStatus(pathaoStatus: string | undefined): ShipmentStatus {
  switch (pathaoStatus) {
    case "Delivered":
      return "DELIVERED";
    case "Cancelled":
      return "CANCELLED";
    case "Return":
    case "Returned":
      return "RETURNED";
    case "Pickup_Requested":
    case "Pending":
      return "PENDING";
    case "Assigned_for_Pickup":
    case "Picked":
      return "PICKED_UP";
    case "In_Transit":
    case "Delivery_in_Progress":
      return "IN_TRANSIT";
    default:
      return "BOOKED";
  }
}

export const PathaoProvider: CourierAdapter = {
  code: "PATHAO",

  async bookShipment(ctx: ShipmentBookingContext): Promise<ShipmentBookingResult> {
    const { cityId, zoneId, areaId } = await resolveLocationIds(ctx.order.shippingDistrict, ctx.order.shippingArea);

    const totalWeightKg = ctx.order.items.reduce((sum) => sum + 0.5, 0) || 0.5;

    const body = {
      store_id: Number(env.pathao.storeId()),
      merchant_order_id: ctx.order.orderNumber,
      recipient_name: ctx.order.shippingRecipient,
      recipient_phone: ctx.order.shippingPhone,
      recipient_address: ctx.order.shippingAddressLine,
      recipient_city: cityId,
      recipient_zone: zoneId,
      recipient_area: areaId,
      delivery_type: 48,
      item_type: 2,
      special_instruction: ctx.order.customerNote ?? "",
      item_quantity: ctx.order.items.reduce((sum, i) => sum + i.quantity, 0),
      item_weight: Math.max(0.5, totalWeightKg),
      amount_to_collect: ctx.codAmount,
      item_description: ctx.order.items.map((i) => i.nameSnapshot).join(", "),
    };

    const response = await pathaoFetch<CreateOrderResponse>("/aut/api/v1/orders", { method: "POST", authed: true, body });

    if (response.code !== 200 || !response.data) {
      throw new CourierProviderError(`Pathao order creation failed: ${response.message}`, response);
    }

    return {
      consignmentId: response.data.consignment_id,
      status: mapStatus(response.data.order_status),
      rawResponse: response,
    };
  },

  async getStatus(consignmentId: string): Promise<ShipmentStatusResult> {
    const response = await pathaoFetch<OrderInfoResponse>(`/aut/api/v1/orders/${consignmentId}/info`, { method: "GET", authed: true });
    if (response.code !== 200) {
      throw new CourierProviderError(`Pathao status lookup failed for ${consignmentId}`, response);
    }
    return { status: mapStatus(response.data?.order_status), rawResponse: response };
  },

  mapWebhookStatus(payload: Record<string, unknown>): ShipmentStatus {
    return mapStatus(String(payload.order_status ?? payload.status ?? ""));
  },
};
