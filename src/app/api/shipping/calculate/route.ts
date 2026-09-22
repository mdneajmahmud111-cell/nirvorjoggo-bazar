import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateShippingFee, ShippingCalculationError } from "@/lib/shipping/calculate";
import { handleApiError, jsonError } from "@/lib/api-response";

const schema = z.object({
  division: z.string().min(1),
  district: z.string().min(1),
  area: z.string().min(1),
  cartWeightKg: z.number().nonnegative().default(0.5),
  cartSubtotal: z.number().nonnegative().default(0),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());
    const estimate = await calculateShippingFee(data);
    return NextResponse.json({ estimate });
  } catch (err) {
    if (err instanceof ShippingCalculationError) return jsonError(err.message, 422);
    return handleApiError(err);
  }
}
