import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation/address";
import { handleApiError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await requireUser();
    const addresses = await prisma.address.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ addresses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const data = addressSchema.parse(await req.json());

    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({ data: { ...data, userId: session.user.id } });
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
