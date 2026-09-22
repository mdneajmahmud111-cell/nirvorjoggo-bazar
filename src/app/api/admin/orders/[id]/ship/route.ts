import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { bookCourierShipment } from "@/lib/couriers/shipment-service";

const schema = z.object({ provider: z.enum(["STEADFAST", "PATHAO"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { provider } = schema.parse(await req.json());
    const shipment = await bookCourierShipment(params.id, provider);
    return NextResponse.json({ shipment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
