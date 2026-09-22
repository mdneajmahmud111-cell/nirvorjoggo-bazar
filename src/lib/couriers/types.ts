import type { CourierProvider as CourierProviderCode, Order, OrderItem, ShipmentStatus } from "@prisma/client";

export interface ShipmentBookingContext {
  order: Order & { items: OrderItem[] };
  codAmount: number;
}

export interface ShipmentBookingResult {
  consignmentId: string;
  trackingCode?: string;
  status: ShipmentStatus;
  trackingUrl?: string;
  rawResponse: unknown;
}

export interface ShipmentStatusResult {
  status: ShipmentStatus;
  rawResponse: unknown;
}

export interface CourierAdapter {
  code: CourierProviderCode;
  bookShipment(ctx: ShipmentBookingContext): Promise<ShipmentBookingResult>;
  getStatus(consignmentId: string): Promise<ShipmentStatusResult>;
  mapWebhookStatus?(payload: Record<string, unknown>): ShipmentStatus;
}

export class CourierProviderError extends Error {
  constructor(
    message: string,
    public readonly rawResponse?: unknown,
  ) {
    super(message);
  }
}
