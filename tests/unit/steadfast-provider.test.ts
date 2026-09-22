import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { steadfast: { baseUrl: () => "https://portal.packzy.com/api/v1", apiKey: () => "key", secretKey: () => "secret" } },
}));

import { SteadfastProvider } from "@/lib/couriers/steadfast.provider";

const order = {
  orderNumber: "NB-TEST-0004",
  shippingRecipient: "Karim",
  shippingPhone: "01912345678",
  shippingAddressLine: "House 5",
  shippingArea: "Mirpur",
  shippingDistrict: "Dhaka",
  shippingDivision: "Dhaka",
  customerNote: "",
  items: [{ nameSnapshot: "Wireless Earbuds" }],
} as any;

describe("SteadfastProvider.bookShipment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the real recipient/order details and maps the returned status", async () => {
    let sentBody: any;
    global.fetch = vi.fn(async (_url: any, options: any) => {
      sentBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          status: 200,
          consignment: { consignment_id: 555, invoice: "NB-TEST-0004", tracking_code: "TRK555", status: "in_review" },
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const result = await SteadfastProvider.bookShipment({ order, codAmount: 500 });

    expect(sentBody.recipient_phone).toBe("01912345678");
    expect(sentBody.cod_amount).toBe(500);
    expect(result.consignmentId).toBe("555");
    expect(result.trackingCode).toBe("TRK555");
    expect(result.status).toBe("PENDING");
  });

  it("throws with the API's own message on failure instead of silently succeeding", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ status: 400, message: "Invalid phone number" }) }) as unknown as Response);
    await expect(SteadfastProvider.bookShipment({ order, codAmount: 500 })).rejects.toThrow(/Invalid phone number/);
  });
});
