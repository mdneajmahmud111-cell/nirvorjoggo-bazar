import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bankAccountSchema } from "@/lib/validation/admin";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const accounts = await prisma.bankAccount.findMany({ orderBy: { displayOrder: "asc" } });
    return NextResponse.json({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const data = bankAccountSchema.parse(await req.json());
    const account = await prisma.bankAccount.create({ data });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
