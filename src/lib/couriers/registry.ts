import type { CourierProvider as CourierProviderCode } from "@prisma/client";
import type { CourierAdapter } from "@/lib/couriers/types";
import { SteadfastProvider } from "@/lib/couriers/steadfast.provider";
import { PathaoProvider } from "@/lib/couriers/pathao.provider";

export const courierRegistry: Record<CourierProviderCode, CourierAdapter> = {
  STEADFAST: SteadfastProvider,
  PATHAO: PathaoProvider,
};

export function getCourierAdapter(code: CourierProviderCode): CourierAdapter {
  return courierRegistry[code];
}
