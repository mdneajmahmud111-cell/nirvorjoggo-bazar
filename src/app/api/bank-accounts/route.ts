import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
    return NextResponse.json({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}
